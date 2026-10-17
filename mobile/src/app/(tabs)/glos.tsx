import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  Badge,
  Button,
  Chip,
  CornerFilterButton,
  EmptyState,
  Sheet,
  TextField,
} from '../../components/ui';
import { formatAgo } from '../../lib/format';
import { useAppData } from '../../state/AppDataContext';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { colors, font, radius, shadow, spacing } from '../../theme';
import type { CivicCategory, CivicMessage, CivicStatus } from '../../types';

type FilterMode = 'all' | CivicCategory | 'mine';

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
    label: 'Wniosek / Inicjatywa',
    shortLabel: 'WNIOSEK',
    icon: 'bulb-outline',
    color: colors.success,
    bg: colors.successSoft,
  },
  zgloszenie: {
    label: 'Zgłoszenie usterki',
    shortLabel: 'ZGŁOSZENIE',
    icon: 'construct-outline',
    color: colors.warning,
    bg: colors.warningSoft,
  },
  skarga: {
    label: 'Skarga / Interwencja',
    shortLabel: 'SKARGA',
    icon: 'alert-circle-outline',
    color: colors.brickDark,
    bg: colors.brickSoft,
  },
  pytanie: {
    label: 'Pytanie do władz',
    shortLabel: 'PYTANIE',
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
  new: { label: 'Wysłano do urzędu', color: colors.inkSoft, bg: colors.cream },
  in_review: { label: 'W realizacji', color: colors.warning, bg: colors.warningSoft },
  answered: { label: 'Odpowiedź urzędu', color: colors.river, bg: colors.riverSoft },
  implemented: { label: 'Zrealizowano', color: colors.success, bg: colors.successSoft },
};

const DEPARTMENTS = [
  'Urząd Miasta — Kancelaria Prezydenta',
  'Miejski Zarząd Dróg (MZD)',
  'Wydział Gospodarki Komunalnej',
  'Wydział Środowiska i Ekologii',
  'Rada Miasta Torunia',
];

const DISTRICTS = [
  'Stare Miasto / Bydgoskie Przedmieście',
  'Chełmińskie Przedmieście / Wrzosy',
  'Rubinkowo / Na Skarpie',
  'Podgórz / Lewobrzeże',
  'Jakubskie / Mokre',
  'Całe miasto',
];

export default function GlosMieszkancaScreen() {
  const { civicMessages, hasUpvotedCivic, toggleCivicUpvote, addCivicMessage } = useAppData();
  const { user, openAuth } = useAuth();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<FilterMode>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      civicMessages.filter((m) => {
        if (filter === 'all') return true;
        if (filter === 'mine') return m.isMine;
        return m.category === filter;
      }),
    [civicMessages, filter],
  );

  const selectedMessage = useMemo(
    () => civicMessages.find((m) => m.id === selectedId) ?? null,
    [civicMessages, selectedId],
  );

  const activeCount = filter !== 'all' ? 1 : undefined;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Głos Mieszkańca"
        subtitle="Wnioski, zgłoszenia i skargi bezpośrednio do władz Torunia"
      />

      <View style={styles.contentArea}>
        <CornerFilterButton
          count={activeCount}
          onPress={() => setFiltersOpen(true)}
          style={styles.cornerBtn}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Baner zachęcający do wysłania głosu do władz */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="megaphone-outline" size={22} color={colors.brick} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Masz wpływ na Toruń</Text>
                <Text style={styles.heroSub}>
                  Wyślij wniosek, zgłoś problem lub złóż skargę do właściwego wydziału Urzędu Miasta.
                  Każde pismo otrzymuje numer sprawy i powiadomienie o odpowiedzi.
                </Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <Button
                label="Wyślij wiadomość do władz"
                icon="paper-plane-outline"
                onPress={() => setComposeOpen(true)}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              {filter === 'mine'
                ? 'Moje wysłane pisma'
                : 'Publiczne pisma i inicjatywy mieszkańców'}
            </Text>
            <Text style={styles.countMeta}>{filtered.length} spraw</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Brak pism w tej kategorii"
              message={
                filter === 'mine'
                  ? 'Nie wysłałeś jeszcze żadnej wiadomości do władz miasta.'
                  : 'W tym widoku nie ma jeszcze zgłoszeń.'
              }
              actionLabel="Wyślij pierwsze pismo"
              onAction={() => setComposeOpen(true)}
            />
          ) : (
            <View style={styles.grid}>
              {filtered.map((msg) => (
                <CivicGridTile
                  key={msg.id}
                  message={msg}
                  upvoted={hasUpvotedCivic(msg.id)}
                  onOpen={() => setSelectedId(msg.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Wysuwane menu filtrów z pojedynczego przycisku w rogu */}
      <Sheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtry — Głos Mieszkańca"
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Wyczyść"
              variant="secondary"
              onPress={() => setFilter('all')}
              style={{ flex: 1 }}
            />
            <Button
              label={`Pokaż (${filtered.length})`}
              onPress={() => setFiltersOpen(false)}
              style={{ flex: 2 }}
            />
          </View>
        }
      >
        <Text style={styles.groupTitle}>Rodzaj pisma do władz</Text>
        <View style={styles.wrap}>
          <Chip
            label="Wszystkie sprawy"
            icon="apps-outline"
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <Chip
            label="Wnioski i inicjatywy"
            icon="bulb-outline"
            selected={filter === 'wniosek'}
            onPress={() => setFilter('wniosek')}
          />
          <Chip
            label="Zgłoszenia usterek"
            icon="construct-outline"
            selected={filter === 'zgloszenie'}
            onPress={() => setFilter('zgloszenie')}
          />
          <Chip
            label="Skargi i interwencje"
            icon="alert-circle-outline"
            selected={filter === 'skarga'}
            onPress={() => setFilter('skarga')}
          />
          <Chip
            label="Pytania do władz"
            icon="help-circle-outline"
            selected={filter === 'pytanie'}
            onPress={() => setFilter('pytanie')}
          />
          <Chip
            label="Moje wysłane pisma"
            icon="person-outline"
            selected={filter === 'mine'}
            onPress={() => setFilter('mine')}
          />
        </View>
      </Sheet>

      {/* Okienko ze szczegółami pisma i odpowiedzią władz */}
      <CivicDetailSheet
        message={selectedMessage}
        onClose={() => setSelectedId(null)}
        upvoted={selectedMessage ? hasUpvotedCivic(selectedMessage.id) : false}
        onToggleUpvote={async () => {
          if (!selectedMessage) return;
          const nowUpvoted = await toggleCivicUpvote(selectedMessage.id);
          showToast(
            nowUpvoted ? 'Poparto pismo mieszkańca' : 'Cofnięto poparcie',
            nowUpvoted ? 'success' : 'info',
          );
        }}
      />

      {/* Formularz wysłania nowego pisma do władz */}
      <ComposeCivicSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        isLogged={Boolean(user)}
        onLoginPrompt={() => {
          setComposeOpen(false);
          setTimeout(
            () => openAuth('login', 'Zaloguj się, aby otrzymywać powiadomienia o odpowiedzi Urzędu Miasta.'),
            250,
          );
        }}
        onSubmit={async (input) => {
          const created = await addCivicMessage(input);
          setComposeOpen(false);
          setSelectedId(created.id);
          showToast(`Pismo przekazane do urzędu (${created.referenceCode})`, 'success');
        }}
      />
    </View>
  );
}

/* ============================================================================
 * Kafelek w 2-kolumnowej siatce — zwięzły, czytelny, kliknięcie otwiera szczegóły
 * ========================================================================== */

function CivicGridTile({
  message,
  upvoted,
  onOpen,
}: {
  message: CivicMessage;
  upvoted: boolean;
  onOpen: () => void;
}) {
  const cat = CATEGORY_META[message.category];
  const st = STATUS_META[message.status];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${cat.label}: ${message.title}`}
      style={({ pressed }) => [
        styles.tile,
        message.isMine && styles.tileMine,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileTop}>
        <Badge label={cat.shortLabel} color={cat.color} bg={cat.bg} icon={cat.icon} />
        {message.officialReply ? (
          <View style={styles.replyDot} accessibilityLabel="Odpowiedź urzędu">
            <Ionicons name="checkmark-done-circle" size={16} color={colors.success} />
          </View>
        ) : null}
      </View>

      <Text style={styles.tileTitle} numberOfLines={2}>
        {message.title}
      </Text>

      <Text style={styles.tileDept} numberOfLines={1}>
        {message.department}
      </Text>

      <View style={styles.tileFooter}>
        <Badge label={st.label} color={st.color} bg={st.bg} />
        <View style={[styles.upvotePill, upvoted && styles.upvotePillActive]}>
          <Ionicons
            name={upvoted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={12}
            color={upvoted ? colors.brick : colors.inkSoft}
          />
          <Text style={[styles.upvoteCount, upvoted && { color: colors.brick }]}>
            {message.upvotes}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================================
 * Modal ze szczegółami pisma i oficjalną odpowiedzią Urzędu Miasta
 * ========================================================================== */

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
      title="Szczegóły pisma do władz"
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={upvoted ? `Popierasz (${message.upvotes})` : `Poprzyj pismo (${message.upvotes})`}
            icon={upvoted ? 'thumbs-up' : 'thumbs-up-outline'}
            variant={upvoted ? 'secondary' : 'primary'}
            onPress={onToggleUpvote}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <View style={styles.detailBadges}>
        <Badge label={cat.label} color={cat.color} bg={cat.bg} icon={cat.icon} />
        <Badge label={message.statusLabel || st.label} color={st.color} bg={st.bg} />
        {message.isMine ? (
          <Badge label="Twoje pismo" color={colors.brickDark} bg={colors.brickSoft} icon="person-outline" />
        ) : null}
      </View>

      <Text style={styles.detailTitle}>{message.title}</Text>

      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Ionicons name="document-text-outline" size={16} color={colors.brick} />
          <Text style={styles.metaText}>Sygnatura sprawy: {message.referenceCode}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={16} color={colors.brick} />
          <Text style={styles.metaText}>Adresat: {message.department}</Text>
        </View>
        {message.district ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.brick} />
            <Text style={styles.metaText}>Osiedle / rejon: {message.district}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={16} color={colors.brick} />
          <Text style={styles.metaText}>
            Autor: {message.author} · {formatAgo(message.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionSmallTitle}>Treść pisma mieszkańca</Text>
      <Text style={styles.detailBody}>{message.description}</Text>

      {message.officialReply ? (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={styles.replyAuthor}>
              Oficjalne stanowisko: {message.department}
            </Text>
          </View>
          <Text style={styles.replyBody}>{message.officialReply}</Text>
        </View>
      ) : (
        <View style={styles.pendingBox}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <Text style={styles.pendingText}>
            Sprawa oczekuje na oficjalne stanowisko wydziału ({message.department}). Po udzieleniu
            odpowiedzi otrzymasz powiadomienie w panelu użytkownika.
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/* ============================================================================
 * Formularz wysłania wiadomości / wniosku / skargi do władz miasta
 * ========================================================================== */

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
      setError('Wpisz krótki tytuł sprawy (min. 5 znaków).');
      return;
    }
    if (description.trim().length < 10) {
      setError('Opisz sprawę dokładniej (min. 10 znaków).');
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
      title="Wyślij pismo do władz Torunia"
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Anuluj" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button
            label="Wyślij do urzędu"
            icon="paper-plane-outline"
            onPress={submit}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      {!isLogged ? (
        <Pressable onPress={onLoginPrompt} style={styles.loginHint} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={18} color={colors.brick} />
          <Text style={styles.loginHintText}>
            Możesz wysłać zgłoszenie teraz, lub zalogować się, aby śledzić status pisma i powiadomienia.
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.groupTitle}>1. Rodzaj wiadomości</Text>
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

      <Text style={styles.groupTitle}>2. Adresat w Urzędzie Miasta</Text>
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

      <Text style={styles.groupTitle}>3. Osiedle / lokalizacja</Text>
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

      <TextField
        label="Temat pisma / sprawy"
        value={title}
        onChangeText={setTitle}
        placeholder="np. Doświetlenie przejścia dla pieszych na ul. Szosa Chełmińska"
      />

      <TextField
        label="Treść wniosku, zgłoszenia lub skargi"
        value={description}
        onChangeText={setDescription}
        placeholder="Opisz dokładnie problem lub propozycję zmiany oraz uzasadnienie dla mieszkańców..."
        multiline
        error={error}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  contentArea: { flex: 1 },
  cornerBtn: {
    left: undefined,
    right: spacing.md,
    top: spacing.sm,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...font.h2, color: colors.ink },
  heroSub: { ...font.small, color: colors.inkSoft, marginTop: 4, lineHeight: 19 },
  heroActions: { flexDirection: 'row' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeading: { ...font.h3, color: colors.inkSoft },
  countMeta: { ...font.tiny, color: colors.muted },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: 8,
    ...shadow.card,
  },
  tileMine: {
    borderColor: colors.brick,
    backgroundColor: colors.brickSoft,
  },
  tilePressed: { opacity: 0.9 },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  replyDot: {
    padding: 2,
  },
  tileTitle: {
    ...font.bodyBold,
    color: colors.ink,
    lineHeight: 20,
  },
  tileDept: {
    ...font.tiny,
    color: colors.muted,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },
  upvotePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
  },
  upvotePillActive: {
    backgroundColor: colors.brickSoft,
  },
  upvoteCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  groupTitle: { ...font.bodyBold, color: colors.ink, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  detailTitle: { ...font.h2, color: colors.ink, marginBottom: spacing.md },
  metaBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { ...font.small, color: colors.inkSoft, flex: 1 },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  sectionSmallTitle: { ...font.bodyBold, color: colors.ink, marginBottom: 6 },
  detailBody: { ...font.body, color: colors.ink, lineHeight: 22, marginBottom: spacing.md },
  replyBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyAuthor: { ...font.bodyBold, color: colors.success, flex: 1 },
  replyBody: { ...font.small, color: colors.ink, lineHeight: 20 },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pendingText: { ...font.small, color: colors.ink, flex: 1, lineHeight: 19 },
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

