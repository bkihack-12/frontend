import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, InlineNotice, Sheet, TextField } from './ui';
import { DEMO_ACCOUNT, useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useAppData } from '../state/AppDataContext';
import { colors, font, radius, spacing } from '../theme';
import { formatDateTime } from '../lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthSheet() {
  const { sheet, closeAuth, openAuth, user } = useAuth();
  const visible = !!sheet;
  const mode = user ? 'account' : sheet?.mode === 'account' ? 'login' : sheet?.mode ?? 'login';

  const title =
    mode === 'account' ? 'Twoje konto' : mode === 'register' ? 'Załóż konto' : 'Zaloguj się';

  return (
    <Sheet visible={visible} onClose={closeAuth} title={title}>
      {mode === 'account' ? (
        <AccountView />
      ) : (
        <View>
          {sheet?.reason ? (
            <View style={{ marginBottom: spacing.md }}>
              <InlineNotice kind="info" text={sheet.reason} />
            </View>
          ) : null}
          <View style={styles.tabs} accessibilityRole="tablist">
            {(['login', 'register'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => openAuth(m, sheet?.reason)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                style={[styles.tab, mode === m && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === m && { color: colors.ink, fontWeight: '600' }]}>
                  {m === 'login' ? 'Logowanie' : 'Rejestracja'}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </View>
      )}
    </Sheet>
  );
}

function LoginForm() {
  const { login, loginDemo, closeAuth } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Podaj adres e-mail.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Nieprawidłowy adres e-mail.';
    if (!password) e.password = 'Podaj hasło.';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await login({ email, password });
    setBusy(false);
    if (res.ok) {
      closeAuth();
      showToast('Zalogowano');
    } else {
      setFormError(res.error);
    }
  };

  const demo = async () => {
    setBusy(true);
    await loginDemo();
    setBusy(false);
    closeAuth();
    showToast(`Zalogowano jako ${DEMO_ACCOUNT.name}`);
  };

  return (
    <View>
      <TextField
        label="E-mail"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="anna@example.pl"
        error={errors.email}
      />
      <TextField
        label="Hasło"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Twoje hasło"
        error={errors.password}
        onSubmitEditing={submit}
      />
      {formError ? <InlineNotice kind="error" text={formError} /> : null}
      <Button label="Zaloguj się" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
      <Button
        label="Szybkie konto demo"
        variant="secondary"
        onPress={demo}
        disabled={busy}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

function RegisterForm() {
  const { register, closeAuth } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Podaj imię.';
    if (!email.trim() || !EMAIL_RE.test(email.trim())) e.email = 'Podaj poprawny e-mail.';
    if (password.length < 6) e.password = 'Min. 6 znaków.';
    if (confirm !== password) e.confirm = 'Hasła różnią się.';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await register({ name, email, password });
    setBusy(false);
    if (res.ok) {
      closeAuth();
      showToast(`Witaj, ${name.trim().split(' ')[0]}!`);
    } else {
      setFormError(res.error);
    }
  };

  return (
    <View>
      <TextField
        label="Imię"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Anna"
        error={errors.name}
      />
      <TextField
        label="E-mail"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="anna@example.pl"
        error={errors.email}
      />
      <TextField
        label="Hasło"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Min. 6 znaków"
        error={errors.password}
      />
      <TextField
        label="Powtórz hasło"
        icon="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Powtórz hasło"
        error={errors.confirm}
        onSubmitEditing={submit}
      />
      {formError ? <InlineNotice kind="error" text={formError} /> : null}
      <Button label="Utwórz konto" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

function AccountView() {
  const { user, logout, closeAuth } = useAuth();
  const { myBookings, events, savedOffers, isInterested } = useAppData();
  const { showToast } = useToast();
  if (!user) return null;

  const interestedCount = events.filter((e) => isInterested(e.id)).length;
  const booked = myBookings
    .map((b) => ({ b, e: events.find((x) => x.id === b.eventId) }))
    .filter((x) => !!x.e);

  return (
    <View>
      <View style={styles.profile}>
        <View style={styles.bigAvatar}>
          <Text style={styles.bigAvatarText}>
            {user.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat n={booked.length} label="Rezerwacje" />
        <Stat n={interestedCount} label="Zainteresowania" />
        <Stat n={savedOffers.length} label="Zapisane" />
      </View>

      {booked.length > 0 ? (
        <>
          <Text style={[font.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Moje rezerwacje</Text>
          {booked.map(({ b, e }) => (
            <View key={b.eventId} style={styles.booking}>
              <Ionicons name="ticket-outline" size={18} color={colors.brick} />
              <View style={{ flex: 1 }}>
                <Text style={font.bodyBold} numberOfLines={1}>
                  {e!.title}
                </Text>
                <Text style={font.small}>
                  {formatDateTime(e!.startsAt)} · kod {b.code}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Button
        label="Wyloguj się"
        variant="danger"
        style={{ marginTop: spacing.lg }}
        onPress={async () => {
          await logout();
          closeAuth();
          showToast('Wylogowano', 'info');
        }}
      />
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontWeight: '500', color: colors.muted, fontSize: 13 },
  profile: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  bigAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarText: { color: colors.brickDark, fontSize: 16, fontWeight: '700' },
  email: { ...font.small, color: colors.muted },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statN: { fontSize: 18, fontWeight: '700', color: colors.ink },
  statL: { ...font.small, color: colors.muted },
  booking: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 6,
    alignItems: 'center',
  },
});
