import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  Badge,
  Button,
  Chip,
   Sheet,
  TextField,
} from '../../components/ui';
import { formatAgo } from '../../lib/format';
import { useAppData } from '../../state/AppDataContext';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { colors, font, radius, shadow, spacing } from '../../theme';
import type { CivicCategory, CivicMessage, CivicStatus } from '../../types';

const CATEGORY_META: Record<
  CivicCategory,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    bg: string;
  }
> = {
  wniosek: {
    label: 'Wniosek',
    shortLabel: 'Wniosek',
    icon: 'bulb-outline',
    color: colors.success,
    bg: colors.successSoft,
  },
  zgloszenie: {
    label: 'Usterka',
    shortLabel: 'Usterka',
    icon: 'construct-outline',
    color: colors.warning,
    bg: colors.warningSoft,
  },
  skarga: {
    label: 'Interwencja',
    shortLabel: 'Interwencja',
    icon: 'alert-circle-outline',
    color: colors.brickDark,
    bg: colors.brickSoft,
  },
  pytanie: {
    label: 'Pytanie',
    shortLabel: 'Pytanie',
    icon: 'help-circle-outline',
    color: colors.river,
    bg: colors.riverSoft,
  },
};

const STATUS_META: Record<
  CivicStatus,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  new: { label: 'Wysłano', color: colors.inkSoft, bg: colors.cream },
  in_review: { label: 'W realizacji', color: colors.warning, bg: colors.warningSoft },
  answered: { label: 'Odpowiedź', color: colors.river, bg: colors.riverSoft },
  implemented: { label: 'Zrealizowano', color: colors.success, bg: colors.successSoft },
};

const DEPARTMENTS = [
  'Kancelaria Prezydenta',
  'Miejski Zarząd Dróg (MZD)',
  'Gospodarka Komunalna',
  'Środowisko i Ekologia',
  'Rada Miasta Torunia',
];

const DISTRICTS = [
  'Stare Miasto / Bydgoskie',
  'Chełmińskie / Wrzosy',
  'Rubinkowo / Na Skarpie',
  'Podgórz / Lewobrzeże',
  'Jakubskie / Mokre',
  'Całe miasto',
];

export default function GlosMieszkancaScreen() {
  const { civicMessages, hasUpvotedCivic, toggleCivicUpvote, addCivicMessage } = useAppData();
  const { user, openAuth } = useAuth();
  const { showToast } = useToast();

  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMessage = useMemo(
    () => civicMessages.find((m) => m.id === selectedId) ?? null,
    [civicMessages, selectedId],
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title="NaszToruń" />

      <View style={styles.contentArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setComposeOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Twój głos może zmienić nasze miasto — zgłoś sprawę"
            style={({ pressed }) => [styles.posterBanner, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.posterDecoCircle} />
            <View style={styles.posterTopRow}>
              <Ionicons name="megaphone" size={26} color="#FFFFFF" />
              <View style={styles.posterCtaPill}>
                <Ionicons name="add" size={16} color={colors.brickDark} />
                <Text style={styles.posterCtaText}>ZGŁOŚ SPRAWĘ</Text>
              </View>
            </View>
            <Text style={styles.posterHeadline}>
              TWÓJ GŁOS MOŻE{'\n'}ZMIENIĆ NASZE MIASTO
            </Text>
          </Pressable>

          <View style={styles.grid}>
            {civicMessages.map((msg) => (
              <CivicGridTile
                key={msg.id}
                message={msg}
                upvoted={hasUpvotedCivic(msg.id)}
                onOpen={() => setSelectedId(msg.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <CivicDetailSheet
        message={selectedMessage}
        onClose={() => setSelectedId(null)}
        upvoted={selectedMessage ? hasUpvotedCivic(selectedMessage.id) : false}
        onToggleUpvote={async () => {
          if (!selectedMessage) return;
          const nowUpvoted = await toggleCivicUpvote(selectedMessage.id);
          showToast(
            nowUpvoted ? 'Poparto sprawę' : 'Cofnięto poparcie',
            nowUpvoted ? 'success' : 'info',
          );
        }}
      />

      <ComposeCivicSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        isLogged={Boolean(user)}
        onLoginPrompt={() => {
          setComposeOpen(false);
          setTimeout(
            () => openAuth('login', 'Zaloguj się, aby śledzić odpowiedzi Urzędu.'),
            250,
          );
        }}
        onSubmit={async (input) => {
          const created = await addCivicMessage(input);
          setComposeOpen(false);
          setSelectedId(created.id);
          showToast(`Przekazano (${created.referenceCode})`, 'success');
        }}
      />
    </View>
  );
}

function CivicGridTile({
  message,
  upvoted,
  onOpen,
}: {
  message: CivicMessage;
  upvoted: boolean;
  onOpen: () => void;
}) {
  const st = STATUS_META[message.status];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={message.title}
      style={({ pressed }) => [
        styles.tile,
        message.isMine && styles.tileMine,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileTop}>
        <Text style={[styles.upvoteHero, upvoted && { color: colors.brick }]}>
          +{message.upvotes}
        </Text>
        <Text style={[styles.statusMini, { color: st.color }]}>{st.label}</Text>
      </View>

      <View style={styles.tileTextGroup}>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {message.title}
        </Text>
        <Text style={styles.districtText} numberOfLines={1}>
          {message.district || 'Toruń'}
        </Text>
      </View>
    </Pressable>
  );
}

function CivicDetailSheet({
  message,
  onClose,
  upvoted,
  onToggleUpvote,
}: {
  message: CivicMessage | null;
  onClose: () => void;
  upvoted: boolean;
  onToggleUpvote: () => void;
}) {
  if (!message) return null;
  const cat = CATEGORY_META[message.category];
  const st = STATUS_META[message.status];

  return (
    <Sheet
      visible={Boolean(message)}
      onClose={onClose}
      title={message.referenceCode}
      footer={
        <Button
          label={upvoted ? `Popierasz (+${message.upvotes})` : `Poprzyj (+${message.upvotes})`}
          icon={upvoted ? 'thumbs-up' : 'thumbs-up-outline'}
          variant={upvoted ? 'secondary' : 'primary'}
          onPress={onToggleUpvote}
        />
      }
    >
      <View style={styles.detailBadges}>
        <Badge label={cat.label} color={cat.color} bg={cat.bg} icon={cat.icon} />
        <Badge label={message.statusLabel || st.label} color={st.color} bg={st.bg} />
      </View>

      <Text style={styles.detailTitle}>{message.title}</Text>

      <View style={styles.locationBox}>
        <Ionicons name="location-outline" size={18} color={colors.brick} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationBoxTitle}>{message.district || 'Toruń'}</Text>
          <Text style={styles.locationBoxSub}>
            {message.department} · {formatAgo(message.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={styles.detailBody}>{message.description}</Text>

      {message.officialReply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyAuthor}>Odpowiedź urzędu</Text>
          <Text style={styles.replyBody}>{message.officialReply}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

function ComposeCivicSheet({
  visible,
  onClose,
  isLogged,
  onLoginPrompt,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  isLogged: boolean;
  onLoginPrompt: () => void;
  onSubmit: (input: {
    category: CivicCategory;
    department: string;
    title: string;
    district: string;
    description: string;
  }) => void;
}) {
  const [category, setCategory] = useState<CivicCategory>('wniosek');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [district, setDistrict] = useState<string>(DISTRICTS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (title.trim().length < 5) {
      setError('Wpisz temat (min. 5 znaków).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Dodaj krótki opis (min. 10 znaków).');
      return;
    }
    setError(undefined);
    onSubmit({
      category,
      department,
      title: title.trim(),
      district,
      description: description.trim(),
    });
    setTitle('');
    setDescription('');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Nowe zgłoszenie"
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Anuluj" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button label="Wyślij" icon="paper-plane-outline" onPress={submit} style={{ flex: 2 }} />
        </View>
      }
    >
      {!isLogged ? (
        <Pressable onPress={onLoginPrompt} style={styles.loginHint} accessibilityRole="button">
          <Ionicons name="person-outline" size={15} color={colors.brick} />
          <Text style={styles.loginHintText}>Zaloguj się, aby śledzić status odpowiedzi</Text>
        </Pressable>
      ) : null}

      <Text style={styles.groupTitle}>Rodzaj</Text>
      <View style={styles.wrap}>
        {(Object.keys(CATEGORY_META) as CivicCategory[]).map((key) => {
          const meta = CATEGORY_META[key];
          return (
            <Chip
              key={key}
              label={meta.label}
              icon={meta.icon}
              selected={category === key}
              onPress={() => setCategory(key)}
            />
          );
        })}
      </View>

      <Text style={styles.groupTitle}>Rejon</Text>
      <View style={styles.wrap}>
        {DISTRICTS.map((dist) => (
          <Chip
            key={dist}
            label={dist}
            selected={district === dist}
            onPress={() => setDistrict(dist)}
          />
        ))}
      </View>

      <Text style={styles.groupTitle}>Wydział</Text>
      <View style={styles.wrap}>
        {DEPARTMENTS.map((dept) => (
          <Chip
            key={dept}
            label={dept}
            selected={department === dept}
            onPress={() => setDepartment(dept)}
          />
        ))}
      </View>

      <TextField
        label="Temat"
        value={title}
        onChangeText={setTitle}
        placeholder="np. Doświetlenie przejścia na ul. Gagarina"
      />

      <TextField
        label="Opis"
        value={description}
        onChangeText={setDescription}
        placeholder="Krótki opis sprawy..."
        multiline
        error={error}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  contentArea: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  posterBanner: {
    backgroundColor: colors.brick,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadow.float,
  },
  posterDecoCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    right: -40,
    bottom: -50,
  },
  posterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  posterCtaText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: colors.brickDark,
  },
  posterHeadline: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 33,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: 12,
    ...shadow.card,
  },
  tileMine: {
    borderColor: colors.brick,
  },
  tilePressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  upvoteHero: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
    color: colors.ink,
  },
  statusMini: {
    fontSize: 11,
    fontWeight: '600',
  },
  tileTextGroup: {
    gap: 3,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  districtText: {
    fontSize: 12,
    color: colors.muted,
  },
  groupTitle: { ...font.small, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  detailTitle: { ...font.h2, color: colors.ink, marginBottom: spacing.sm },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  locationBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  locationBoxSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  detailBody: { ...font.body, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.md },
  replyBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  replyAuthor: { ...font.small, fontWeight: '700', color: colors.success },
  replyBody: { ...font.small, color: colors.ink, lineHeight: 19 },
  loginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brickSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  loginHintText: { ...font.small, color: colors.brickDark, flex: 1 },
});
