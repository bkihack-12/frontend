import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TorunMap, TorunMapHandle } from '../../components/TorunMap';
import { NearbyPanel, PEEK_EMPTY, PEEK_SELECTED } from '../../components/NearbyPanel';
import { EventDetailSheet } from '../../components/EventDetailSheet';
import { EventFiltersSheet } from '../../components/EventFiltersSheet';
import { Button, Chip, CornerFilterButton, Sheet, TextField } from '../../components/ui';
import { CATEGORY_META } from '../../data/events';
import {
  DEFAULT_FILTERS,
  EventFilters,
  activeFilterCount,
  filterEvents,
  withDistance,
} from '../../lib/eventFilters';
import { TORUN_CENTER, LatLng } from '../../lib/geo';
import { useAppData } from '../../state/AppDataContext';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { colors, font, radius, shadow, spacing } from '../../theme';
import type { EventCategory } from '../../types';

export default function SpolecznoscScreen() {
  const {
    events,
    addEvent,
    deleteEvent,
    canDeleteEvent,
    isMyEvent,
    interestedCount,
    taxVerified,
  } = useAppData();
  const { user, sheet, openAuth } = useAuth();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyMyEvents, setOnlyMyEvents] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [mapHeight, setMapHeight] = useState(500);
  const [loading, setLoading] = useState(true);

  /* Dodawanie wydarzenia z wyborem punktu na mapie */
  const [pickingPoint, setPickingPoint] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<LatLng>(TORUN_CENTER);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const mapRef = useRef<TorunMapHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const all = useMemo(() => withDistance(events), [events]);
  const baseFiltered = useMemo(() => filterEvents(all, filters), [all, filters]);
  const myEventsTotal = useMemo(
    () => all.filter((e) => isMyEvent(e.id)).length,
    [all, isMyEvent],
  );
  const filtered = useMemo(
    () => (onlyMyEvents ? all.filter((e) => isMyEvent(e.id)) : baseFiltered),
    [all, baseFiltered, onlyMyEvents, isMyEvent],
  );
  const selected = useMemo(() => filtered.find((e) => e.id === selectedId) ?? null, [filtered, selectedId]);
  const detail = useMemo(() => all.find((e) => e.id === detailId) ?? null, [all, detailId]);
  const nFilters = activeFilterCount(filters);

  useEffect(() => {
    if (selectedId && !filtered.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  const pendingRef = useRef<string | null>(null);
  const prevSheet = useRef(sheet);
  useEffect(() => {
    if (user && pendingRef.current) {
      const id = pendingRef.current;
      pendingRef.current = null;
      setTimeout(() => setDetailId(id), 350);
    } else if (prevSheet.current && !sheet && pendingRef.current) {
      pendingRef.current = null;
    }
    prevSheet.current = sheet;
  }, [user, sheet]);

  const onNeedAuth = useCallback(
    (mode: 'login' | 'register', e: { id: string; type: string; action?: string }) => {
      pendingRef.current = e.id;
      setDetailId(null);
      setTimeout(
        () =>
          openAuth(
            mode,
            e.action === 'ticket'
              ? 'Zaloguj się, aby kupić bilet.'
              : 'Zaloguj się, aby zapisać się na wydarzenie.',
          ),
        350,
      );
    },
    [openAuth],
  );

  const showOnMap = useCallback((e: { id: string; lat: number; lng: number }) => {
    setSelectedId(e.id);
    setPanelOpen(false);
    setDetailId(null);
    mapRef.current?.focusOn({ lat: e.lat, lng: e.lng }, 16);
  }, []);

  const startAddingEvent = () => {
    setPanelOpen(false);
    setSelectedId(null);
    setPickingPoint(true);
  };

  const peek = selected ? PEEK_SELECTED : PEEK_EMPTY;

  return (
    <View style={styles.root}>
      <ScreenHeader title="NaszToruń" />

      <View style={styles.mapArea} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
        <TorunMap
          ref={mapRef}
          events={loading ? [] : filtered}
          selectedId={selectedId}
          onSelect={(id) => {
            if (pickingPoint) return;
            setSelectedId(id);
            if (id) setPanelOpen(false);
          }}
          interestedCount={interestedCount}
          showHeat={showHeat}
          onToggleHeat={() => setShowHeat((v) => !v)}
          bottomInset={pickingPoint ? 96 : peek}
          hideControls={panelOpen}
          pickedPoint={pickingPoint || addSheetOpen ? pickedPoint : null}
          onPickPoint={
            pickingPoint
              ? (pt) => {
                  setPickedPoint(pt);
                }
              : undefined
          }
        />

        {!pickingPoint ? (
          <>
            <CornerFilterButton
              count={nFilters || undefined}
              onPress={() => setFiltersOpen(true)}
            />

            <Pressable
              onPress={startAddingEvent}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dodaj wydarzenie"
              style={({ pressed }) => [styles.cornerAddBtn, pressed && { opacity: 0.88 }]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.cornerAddText}>Dodaj wydarzenie</Text>
            </Pressable>

            <NearbyPanel
              events={filtered}
              loading={loading}
              selected={selected}
              open={panelOpen}
              onOpenChange={setPanelOpen}
              mapHeight={mapHeight}
              hasFilters={nFilters > 0}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onOpenEvent={(e) => setDetailId(e.id)}
              onShowOnMap={showOnMap}
              onClearSelection={() => setSelectedId(null)}
              canDeleteEvent={canDeleteEvent}
              onlyMyEvents={onlyMyEvents}
              myEventsTotal={myEventsTotal}
              onToggleOnlyMyEvents={() => {
                setOnlyMyEvents((prev) => {
                  const next = !prev;
                  if (next) setPanelOpen(true);
                  return next;
                });
              }}
              onDeleteEvent={(e) => {
                if (!canDeleteEvent(e)) return;
                deleteEvent(e.id);
                if (selectedId === e.id) setSelectedId(null);
                if (detailId === e.id) setDetailId(null);
                showToast('Usunięto wydarzenie', 'info');
              }}
            />
          </>
        ) : (
          <View style={styles.pickBanner}>
            <View style={styles.pickInfoRow}>
              <Ionicons name="location" size={18} color={colors.brick} />
              <Text style={styles.pickTitle} numberOfLines={1}>
                Dotknij mapy, aby zaznaczyć miejsce
              </Text>
            </View>
            <View style={styles.pickActions}>
              <Button
                label="Anuluj"
                variant="secondary"
                small
                onPress={() => setPickingPoint(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Zatwierdź punkt"
                icon="checkmark"
                small
                onPress={() => {
                  setPickingPoint(false);
                  setAddSheetOpen(true);
                }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}
      </View>

      <EventFiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
      />

      <EventDetailSheet
        event={detail}
        onClose={() => setDetailId(null)}
        onShowOnMap={showOnMap}
        onNeedAuth={onNeedAuth}
        taxVerified={taxVerified}
        onOpenTaxForm={() => openAuth('account')}
      />

      <AddEventSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        point={pickedPoint}
        onChangePointOnMap={() => {
          setAddSheetOpen(false);
          setPickingPoint(true);
        }}
        onSubmit={async (input) => {
          const created = await addEvent({
            ...input,
            lat: pickedPoint.lat,
            lng: pickedPoint.lng,
          });
          setAddSheetOpen(false);
          setSelectedId(created.id);
          mapRef.current?.focusOn({ lat: created.lat, lng: created.lng }, 15.5);
          showToast('Dodano wydarzenie na mapę', 'success');
        }}
      />
    </View>
  );
}

function AddEventSheet({
  visible,
  onClose,
  point,
  onChangePointOnMap,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  point: LatLng;
  onChangePointOnMap: () => void;
  onSubmit: (input: {
    title: string;
    category: EventCategory;
    venue: string;
    address: string;
    isFree: boolean;
    priceZl?: number;
    description: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState<EventCategory>('kultura');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('25');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length < 3) {
      setError('Podaj nazwę wydarzenia.');
      return;
    }
    if (venue.trim().length < 2) {
      setError('Podaj nazwę miejsca.');
      return;
    }
    setError('');
    setBusy(true);
    await onSubmit({
      title: title.trim(),
      category,
      venue: venue.trim(),
      address: venue.trim(),
      isFree,
      priceZl: isFree ? undefined : Number(price) || 25,
      description: description.trim() || 'Wydarzenie otwarte dla mieszkańców Torunia.',
    });
    setBusy(false);
    setTitle('');
    setVenue('');
    setDescription('');
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Nowe wydarzenie"
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Anuluj" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button
            label="Dodaj na mapę"
            icon="add-circle-outline"
            loading={busy}
            onPress={submit}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <Pressable onPress={onChangePointOnMap} style={styles.pointCard}>
        <Ionicons name="location" size={18} color={colors.brick} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pointTitle}>Punkt na mapie zaznaczony</Text>
          <Text style={styles.pointCoords}>
            {point.lat.toFixed(4)}°N, {point.lng.toFixed(4)}°E
          </Text>
        </View>
        <Text style={styles.changePointLink}>Zmień na mapie</Text>
      </Pressable>

      <TextField
        label="Nazwa wydarzenia"
        value={title}
        onChangeText={setTitle}
        placeholder="np. Wieczorny spacer fotograficzny"
      />

      <TextField
        label="Miejsce / adres"
        icon="location-outline"
        value={venue}
        onChangeText={setVenue}
        placeholder="np. Bulwar Filadelfijski"
      />

      <Text style={styles.groupTitle}>Kategoria</Text>
      <View style={styles.wrap}>
        {(Object.keys(CATEGORY_META) as EventCategory[]).map((c) => (
          <Chip
            key={c}
            label={CATEGORY_META[c].label}
            icon={CATEGORY_META[c].icon as never}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>

      <Text style={styles.groupTitle}>Wstęp</Text>
      <View style={styles.wrap}>
        <Chip label="Bezpłatne" selected={isFree} onPress={() => setIsFree(true)} />
        <Chip label="Płatne" selected={!isFree} onPress={() => setIsFree(false)} />
      </View>

      {!isFree ? (
        <TextField
          label="Cena biletu (zł)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="25"
        />
      ) : null}

      <TextField
        label="Krótki opis"
        value={description}
        onChangeText={setDescription}
        placeholder="Dodatkowe informacje..."
        multiline
        error={error}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  mapArea: { flex: 1 },
  cornerAddBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 45,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.brick,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    ...shadow.float,
  },
  cornerAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadow.float,
  },
  pickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  pickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brickSoft,
    marginBottom: spacing.md,
  },
  pointTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  pointCoords: {
    fontSize: 11,
    color: colors.inkSoft,
  },
  changePointLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brickDark,
  },
  groupTitle: { ...font.small, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
});
