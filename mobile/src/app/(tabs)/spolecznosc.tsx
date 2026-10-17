import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TorunMap, TorunMapHandle } from '../../components/TorunMap';
import { NearbyPanel, PEEK_EMPTY, PEEK_SELECTED } from '../../components/NearbyPanel';
import { EventDetailSheet } from '../../components/EventDetailSheet';
import { EventFiltersSheet } from '../../components/EventFiltersSheet';
import { OfferDetailSheet, TaxpayerDeclaration, TaxpayerFormSheet } from '../../components/OfferParts';
import { CornerFilterButton } from '../../components/ui';
import {
  DEFAULT_FILTERS,
  EventFilters,
  activeFilterCount,
  filterEvents,
  withDistance,
} from '../../lib/eventFilters';
import { useAppData } from '../../state/AppDataContext';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { colors } from '../../theme';
import type { CityOffer } from '../../types';

export default function SpolecznoscScreen() {
  const { events, interestedCount } = useAppData();
  const { user, sheet, openAuth } = useAuth();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [openOffer, setOpenOffer] = useState<CityOffer | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showHeat, setShowHeat] = useState(true);
  const [mapHeight, setMapHeight] = useState(500);
  const [loading, setLoading] = useState(true);
  const [taxFormOpen, setTaxFormOpen] = useState(false);
  const [taxDecl, setTaxDecl] = useState<TaxpayerDeclaration | null>(null);
  const mapRef = useRef<TorunMapHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const all = useMemo(() => withDistance(events), [events]);
  const filtered = useMemo(() => filterEvents(all, filters), [all, filters]);
  const selected = useMemo(() => filtered.find((e) => e.id === selectedId) ?? null, [filtered, selectedId]);
  const detail = useMemo(() => all.find((e) => e.id === detailId) ?? null, [all, detailId]);
  const nFilters = activeFilterCount(filters);

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

  const peek = selected ? PEEK_SELECTED : PEEK_EMPTY;
  const taxVerified = Boolean(taxDecl?.confirmed);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Społeczność" subtitle="Wydarzenia i zniżki partnerskie w Toruniu" />

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

        {/* Pojedynczy przycisk filtrów w rogu mapy otwierający wysuwane menu */}
        <CornerFilterButton
          count={nFilters || undefined}
          onPress={() => setFiltersOpen(true)}
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
          onOpenOffer={(o) => setOpenOffer(o)}
          onShowOnMap={showOnMap}
          onClearSelection={() => setSelectedId(null)}
          taxDecl={taxDecl}
          onOpenTaxForm={() => setTaxFormOpen(true)}
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
        taxVerified={taxVerified}
        onOpenTaxForm={() => setTaxFormOpen(true)}
      />
      <OfferDetailSheet
        offer={openOffer}
        onClose={() => setOpenOffer(null)}
        taxVerified={taxVerified}
        onOpenTaxForm={() => setTaxFormOpen(true)}
      />
      <TaxpayerFormSheet
        visible={taxFormOpen}
        onClose={() => setTaxFormOpen(false)}
        initial={taxDecl}
        onSave={(decl) => {
          setTaxDecl(decl);
          showToast('Potwierdzono rozliczanie podatków w Toruniu', 'success');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  mapArea: { flex: 1 },
});
