import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, InlineNotice, Sheet, TextField } from './ui';
import { DEMO_ACCOUNT, useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useAppData } from '../state/AppDataContext';
import { colors, font, radius, spacing } from '../theme';
import { formatAgo, formatDateTime } from '../lib/format';
import type { NotificationPrefs } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  {
    key: 'authorityReplies',
    label: 'Odpowiedzi władz miasta (Urząd / MZD)',
    desc: 'Zmiany statusu Twoich wniosków, skarg i zgłoszeń obywatelskich',
    icon: 'megaphone-outline',
  },
  {
    key: 'transitAlerts',
    label: 'Alerty MZK i utrudnienia w ruchu',
    desc: 'Zweryfikowane awarie tramwajów, objazdy i korki w Toruniu',
    icon: 'bus-outline',
  },
  {
    key: 'partnerDiscounts',
    label: 'Nowe zniżki od lokalnych firm',
    desc: 'Promocje restauracji, usług i przedsiębiorstw dla podatników w Toruniu',
    icon: 'pricetag-outline',
  },
  {
    key: 'eventReminders',
    label: 'Przypomnienia o moich wydarzeniach',
    desc: 'Powiadomienia przed wydarzeniami, na które masz rezerwację',
    icon: 'calendar-outline',
  },
];

export function AuthSheet() {
  const { sheet, closeAuth, openAuth, user } = useAuth();
  const visible = !!sheet;
  const mode = user ? 'account' : sheet?.mode ?? 'login';

  const title =
    user
      ? 'Panel mieszkańca i powiadomienia'
      : mode === 'account'
        ? 'Powiadomienia i konto'
        : mode === 'register'
          ? 'Załóż konto mieszkańca'
          : 'Panel logowania';

  return (
    <Sheet visible={visible} onClose={closeAuth} title={title}>
      {user ? (
        <AccountView />
      ) : (
        <View>
          {sheet?.reason ? (
            <View style={{ marginBottom: spacing.md }}>
              <InlineNotice kind="info" text={sheet.reason} />
            </View>
          ) : null}
          <View style={styles.tabs} accessibilityRole="tablist">
            {(
              [
                { k: 'login', label: 'Logowanie' },
                { k: 'register', label: 'Rejestracja' },
                { k: 'account', label: 'Powiadomienia' },
              ] as const
            ).map((m) => (
              <Pressable
                key={m.k}
                onPress={() => openAuth(m.k, sheet?.reason)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m.k }}
                style={[styles.tab, mode === m.k && styles.tabActive]}
              >
                <Text style={[styles.tabText, mode === m.k && { color: colors.ink, fontWeight: '600' }]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {mode === 'login' ? (
            <LoginForm />
          ) : mode === 'register' ? (
            <RegisterForm />
          ) : (
            <NotificationsPanel onAskLogin={() => openAuth('login')} />
          )}
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
      showToast('Zalogowano pomyślnie');
    } else {
      setFormError(res.error);
    }
  };

  const demo = async () => {
    setBusy(true);
    await loginDemo();
    setBusy(false);
    showToast(`Zalogowano jako ${DEMO_ACCOUNT.name}`);
  };

  return (
    <View>
      <View style={styles.loginHintBox}>
        <Ionicons name="notifications-circle-outline" size={22} color={colors.river} />
        <Text style={styles.loginHintText}>
          Zaloguj się, aby odbierać spersonalizowane powiadomienia z Urzędu Miasta, alerty MZK oraz zarządzać swoimi zgłoszeniami i rezerwacjami.
        </Text>
      </View>

      <TextField
        label="E-mail"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="anna@mojtorun.pl"
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
        label="Wejdź na szybkie konto demo (Ania Demo)"
        icon="flash-outline"
        variant="secondary"
        onPress={demo}
        disabled={busy}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

function RegisterForm() {
  const { register } = useAuth();
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
    if (name.trim().length < 2) e.name = 'Podaj imię i nazwisko.';
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
      showToast(`Witaj, ${name.trim().split(' ')[0]}!`);
    } else {
      setFormError(res.error);
    }
  };

  return (
    <View>
      <TextField
        label="Imię i nazwisko"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Anna Kowalska"
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
      <Button label="Utwórz konto mieszkańca" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

function NotificationsPanel({ onAskLogin }: { onAskLogin?: () => void }) {
  const { user } = useAuth();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    notificationPrefs,
    toggleNotificationPref,
  } = useAppData();

  const kindMeta = {
    city: { icon: 'megaphone-outline' as const, color: colors.brick, bg: colors.brickSoft },
    transit: { icon: 'bus-outline' as const, color: colors.river, bg: colors.riverSoft },
    event: { icon: 'calendar-outline' as const, color: colors.success, bg: colors.successSoft },
    offer: { icon: 'pricetag-outline' as const, color: colors.warning, bg: colors.warningSoft },
  };

  return (
    <View>
      {!user && onAskLogin ? (
        <View style={styles.loginHintBox}>
          <Ionicons name="person-circle-outline" size={20} color={colors.brick} />
          <Text style={styles.loginHintText}>
            Zaloguj się, aby przypisać powiadomienia i odpowiedzi Urzędu Miasta do swojego profilu.
          </Text>
          <Button label="Zaloguj" small onPress={onAskLogin} />
        </View>
      ) : null}

      <View style={styles.notifHeaderRow}>
        <Text style={font.h3}>Powiadomienia dla Ciebie</Text>
        {unreadNotificationCount > 0 ? (
          <Pressable onPress={markAllNotificationsRead}>
            <Text style={styles.markReadLink}>Oznacz jako przeczytane ({unreadNotificationCount})</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 8, marginBottom: spacing.lg }}>
        {notifications.map((n) => {
          const km = kindMeta[n.kind];
          return (
            <Pressable
              key={n.id}
              onPress={() => markNotificationRead(n.id)}
              style={[styles.notifCard, !n.read && styles.notifCardUnread]}
            >
              <View style={[styles.notifIconWrap, { backgroundColor: km.bg }]}>
                <Ionicons name={km.icon} size={17} color={km.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, !n.read && { fontWeight: '700' }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.notifBody}>{n.body}</Text>
                <Text style={styles.notifTime}>{formatAgo(n.createdAt)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[font.h3, { marginBottom: spacing.sm }]}>Ustawienia powiadomień użytkownika</Text>
      <View style={{ gap: 8 }}>
        {PREF_LABELS.map((pref) => {
          const enabled = notificationPrefs[pref.key];
          return (
            <Pressable
              key={pref.key}
              onPress={() => toggleNotificationPref(pref.key)}
              style={styles.prefRow}
            >
              <Ionicons name={pref.icon} size={18} color={enabled ? colors.river : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>{pref.label}</Text>
                <Text style={styles.prefDesc}>{pref.desc}</Text>
              </View>
              <Ionicons
                name={enabled ? 'checkbox' : 'square-outline'}
                size={22}
                color={enabled ? colors.brick : colors.muted}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AccountView() {
  const { user, logout, closeAuth } = useAuth();
  const { myBookings, events, savedOffers, isInterested, civicMessages, unreadNotificationCount } = useAppData();
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<'notifications' | 'profile'>('notifications');

  if (!user) return null;

  const interestedCount = events.filter((e) => isInterested(e.id)).length;
  const booked = myBookings
    .map((b) => ({ b, e: events.find((x) => x.id === b.eventId) }))
    .filter((x) => !!x.e);
  const myCivic = civicMessages.filter((m) => m.isMine);

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
          <Text style={styles.email}>{user.email} · Konto mieszkańca Torunia</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setSubTab('notifications')}
          style={[styles.tab, subTab === 'notifications' && styles.tabActive]}
        >
          <Text style={[styles.tabText, subTab === 'notifications' && { color: colors.ink, fontWeight: '600' }]}>
            Powiadomienia {unreadNotificationCount > 0 ? `(${unreadNotificationCount})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSubTab('profile')}
          style={[styles.tab, subTab === 'profile' && styles.tabActive]}
        >
          <Text style={[styles.tabText, subTab === 'profile' && { color: colors.ink, fontWeight: '600' }]}>
            Moja aktywność
          </Text>
        </Pressable>
      </View>

      {subTab === 'notifications' ? (
        <NotificationsPanel />
      ) : (
        <View>
          <View style={styles.stats}>
            <Stat n={booked.length} label="Rezerwacje" />
            <Stat n={interestedCount} label="Wydarzenia" />
            <Stat n={savedOffers.length} label="Zniżki" />
            <Stat n={myCivic.length} label="Pisma do władz" />
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

          {myCivic.length > 0 ? (
            <>
              <Text style={[font.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
                Moje pisma do władz miasta
              </Text>
              {myCivic.map((m) => (
                <View key={m.id} style={styles.booking}>
                  <Ionicons name="megaphone-outline" size={18} color={colors.river} />
                  <View style={{ flex: 1 }}>
                    <Text style={font.bodyBold} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text style={font.small}>
                      {m.referenceCode} · {m.statusLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </View>
      )}

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
  loginHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  loginHintText: {
    ...font.small,
    color: colors.inkSoft,
    flex: 1,
  },
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
  stats: { flexDirection: 'row', gap: spacing.xs },
  stat: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statN: { fontSize: 17, fontWeight: '700', color: colors.ink },
  statL: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 2 },
  booking: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 6,
    alignItems: 'center',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  markReadLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brick,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  notifCardUnread: {
    backgroundColor: '#FFFDFD',
    borderColor: '#E5BFB8',
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  notifTitle: {
    ...font.small,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brick,
  },
  notifBody: {
    ...font.small,
    color: colors.inkSoft,
    marginTop: 2,
  },
  notifTime: {
    ...font.tiny,
    color: colors.muted,
    marginTop: 4,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  prefTitle: {
    ...font.small,
    fontWeight: '600',
    color: colors.ink,
  },
  prefDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
});
