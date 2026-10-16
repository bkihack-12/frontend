import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TorunMap, TorunMapHandle } from '../../components/TorunMap';
import { NearbyPanel, PEEK_EMPTY, PEEK_SELECTED } from '../../components/NearbyPanel';
import { EventDetailSheet } from '../../components/EventDetailSheet';
import { EventFiltersSheet } from '../../components/EventFiltersSheet';
import { Chip, ChipRow } from '../../components/ui';
import {
  DEFAULT_FILTERS,
  EventFilters,
  activeFilterCount,
  filterEvents,
  withDistance,
} from '../../lib/eventFilters';
import { useAppData } from '../../state/AppDataContext';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing } from '../../theme';

export default function SpolecznoscScreen() {
  const { events, interestedCount } = useAppData();
  const { user, sheet, openAuth } = useAuth();

  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [mapHeight, setMapHeight] = useState(500);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<TorunMapHandle>(null);

  // Simulated initial loading state (data is local).
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const all = useMemo(() => withDistance(events), [events]);
  const filtered = useMemo(() => filterEvents(all, filters), [all, filters]);
  const selected = useMemo(() => filtered.find((e) => e.id === selectedId) ?? null, [filtered, selectedId]);
  const detail = useMemo(() => all.find((e) => e.id === detailId) ?? null, [all, detailId]);
  const nFilters = activeFilterCount(filters);

  // Deselect markers that were filtered out.
  useEffect(() => {
    if (selectedId && !filtered.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  /* After a signed-out user logs in from the event sheet, re-open that event. */
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
              ? 'Zaloguj się lub załóż konto, aby kupić bilet na to wydarzenie.'
              : 'Zaloguj się lub załóż konto, aby zapisać się na to wydarzenie.',
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

  const toggleQuickDate = (d: EventFilters['date']) =>
    setFilters((f) => ({ ...f, date: f.date === d ? 'all' : d }));

  const peek = selected ? PEEK_SELECTED : PEEK_EMPTY;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Społeczność" subtitle="Wydarzenia i aktywność w Toruniu" />
      <View style={styles.filterBar}>
        <ChipRow>
          <Chip
            label="Filtry"
            icon="options"
            count={nFilters || undefined}
            selected={nFilters > 0}
            onPress={() => setFiltersOpen(true)}
          />
          <Chip label="Dziś" selected={filters.date === 'today'} onPress={() => toggleQuickDate('today')} />
          <Chip label="Jutro" selected={filters.date === 'tomorrow'} onPress={() => toggleQuickDate('tomorrow')} />
          <Chip label="Weekend" selected={filters.date === 'weekend'} onPress={() => toggleQuickDate('weekend')} />
          <Chip
            label="Bezpłatne"
            icon="gift-outline"
            selected={filters.cost === 'free'}
            onPress={() => setFilters((f) => ({ ...f, cost: f.cost === 'free' ? 'all' : 'free' }))}
          />
          <Chip
            label="Z zapisami"
            icon="ticket-outline"
            selected={filters.type === 'limited'}
            onPress={() => setFilters((f) => ({ ...f, type: f.type === 'limited' ? 'all' : 'limited' }))}
          />
          {nFilters > 0 ? (
            <Chip label="Wyczyść" icon="close" onPress={() => setFilters(DEFAULT_FILTERS)} />
          ) : null}
        </ChipRow>
      </View>

      <View style={styles.mapArea} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
        <TorunMap
          ref={mapRef}
          events={loading ? [] : filtered}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id) setPanelOpen(false);
          }}
          interestedCount={interestedCount}
          showHeat={showHeat}
          onToggleHeat={() => setShowHeat((v) => !v)}
          bottomInset={peek}
          hideControls={panelOpen}
        />
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
        />
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  filterBar: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  mapArea: { flex: 1 },
});

