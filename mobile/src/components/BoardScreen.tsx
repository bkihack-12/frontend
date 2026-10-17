import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Button,
  Chip,
  CornerFilterButton,
  EmptyState,
  LoadingState,
  Sheet,
} from './ui';
import { ScreenHeader } from './ScreenHeader';
import { MapMarkerItem, MapPolylineItem, TorunMap, TorunMapHandle } from './TorunMap';
import { PEEK_EMPTY, PEEK_SELECTED } from './NearbyPanel';
import { formatAgo, pluralPl } from '../lib/format';
import type { MapPoint, Severity, TransitStop } from '../types';
import { colors, font, radius, shadow, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface BoardItem {
  id: string;
  typeKey: string;
  typeLabel: string;
  icon: IconName;
  color: string;
  title: string;
  where: string;
  stopId?: string;
  lines?: string[];
  reportedAt: string;
  severity: Severity;
  impact: string;
  status: string;
  description: string;
  source: 'sample' | 'user';
  author?: string;
  lat: number;
  lng: number;
  path: MapPoint[];
  lengthLabel: string;
}

export interface BoardFilterOption {
  key: string;
  label: string;
  icon?: IconName;
}

function BoardCard({
  item,
  selected,
  onShowOnMap,
}: {
  item: BoardItem;
  selected: boolean;
  onSelect: () => void;
  onShowOnMap: () => void;
}) {
  return (
    <Pressable
      onPress={onShowOnMap}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: item.color, backgroundColor: '#FAFBFD' },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badges}>
          {item.lines?.map((l) => (
            <View key={l} style={styles.lineBadge}>
              <Text style={styles.lineText}>L{l}</Text>
            </View>
          ))}
          <Badge label={item.typeLabel} color={item.color} bg={`${item.color}16`} icon={item.icon} />
        </View>
        <View style={[styles.impactPill, { backgroundColor: `${item.color}14` }]}>
          <Text style={[styles.impactPillText, { color: item.color }]} numberOfLines={1}>
            {item.impact}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>

      <View style={styles.whereRow}>
        <Ionicons name="location" size={12} color={item.color} />
        <Text style={styles.whereText} numberOfLines={1}>
          {item.where} · {item.lengthLabel}
        </Text>
      </View>

      <Text style={styles.desc} numberOfLines={selected ? 3 : 1}>
        {item.description}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.statusText} numberOfLines={1}>
          {item.status} · {formatAgo(item.reportedAt)}
        </Text>
        <View style={{ flex: 1 }} />
        <View style={styles.mapHintPill}>
          <Ionicons name="locate-outline" size={13} color={colors.inkSoft} />
          <Text style={styles.mapHintText}>Mapa</Text>
        </View>
      </View>
    </Pressable>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  items: BoardItem[];
  typeFilters: BoardFilterOption[];
  lineFilters?: string[];
  stops?: TransitStop[];
  extraPolylines?: MapPolylineItem[];
  showItemPaths?: boolean;
  mapMode?: 'traffic' | 'transit';
  fabLabel: string;
  onFab: (stopId?: string) => void;
  emptyTitle: string;
  emptyMessage: string;
}

export function BoardScreen({
  title,
  subtitle,
  items,
  typeFilters,
  lineFilters,
  stops = [],
  extraPolylines = [],
  showItemPaths = true,
  mapMode = 'traffic',
  fabLabel,
  onFab,
  emptyTitle,
  emptyMessage,
}: Props) {
  const [type, setType] = useState('all');
  const [line, setLine] = useState('all');
  const [stopFilter, setStopFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapHeight, setMapHeight] = useState(500);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<TorunMapHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () =>
      items
        .filter((it) => type === 'all' || it.typeKey === type)
        .filter((it) => line === 'all' || it.lines?.includes(line))
        .filter((it) => stopFilter === 'all' || it.stopId === stopFilter)
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    [items, type, line, stopFilter],
  );

  const visibleStops = useMemo(
    () =>
      stops.filter(
        (s) =>
          (line === 'all' || s.lines.includes(line)) &&
          (stopFilter === 'all' || s.id === stopFilter),
      ),
    [stops, line, stopFilter],
  );

  const selectedItem = useMemo(
    () => filtered.find((it) => it.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedId) ?? null,
    [stops, selectedId],
  );

  useEffect(() => {
    if (
      selectedId &&
      !filtered.some((it) => it.id === selectedId) &&
      !visibleStops.some((s) => s.id === selectedId)
    ) {
      setSelectedId(null);
    }
  }, [filtered, visibleStops, selectedId]);

  const markers = useMemo<MapMarkerItem[]>(
    () =>
      filtered.map((it) => ({
        id: it.id,
        lat: it.lat,
        lng: it.lng,
        title: it.title,
        subtitle: it.where,
        color: it.color,
        icon: it.icon,
      })),
    [filtered],
  );

  const polylines = useMemo<MapPolylineItem[]>(() => {
    // Odcinki utrudnień (w komunikacji miejskiej: tylko zweryfikowane mają path.length >= 2)
    const activeLines = showItemPaths
      ? filtered
          .filter((it) => it.path && it.path.length >= 2)
          .map((it) => ({
            id: it.id,
            path: it.path,
            color: it.color,
            label: it.lines?.length
              ? `⚠ L${it.lines.join('/')} · ${it.typeLabel} (${it.lengthLabel})`
              : `${it.typeLabel} · ${it.lengthLabel}`,
            dashed: true,
            faint: false,
          }))
      : [];
    const refLines = extraPolylines.filter((r) => line === 'all' || r.id === `ref-${line}`);
    return [...refLines, ...activeLines];
  }, [filtered, extraPolylines, line, showItemPaths]);

  const focusItemOnMap = useCallback((item: BoardItem) => {
    setSelectedId(item.id);
    setPanelOpen(false);
    mapRef.current?.focusOn({ lat: item.lat, lng: item.lng }, 14.9);
  }, []);

  const handleMapSelect = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedId(null);
        return;
      }
      if (id.startsWith('ref-')) {
        const lineNum = id.replace('ref-', '');
        setLine((prev) => (prev === lineNum ? 'all' : lineNum));
        return;
      }
      setSelectedId(id);
      setPanelOpen(false);
      const foundItem = filtered.find((x) => x.id === id);
      if (foundItem) {
        mapRef.current?.focusOn({ lat: foundItem.lat, lng: foundItem.lng }, 14.9);
        return;
      }
      const foundStop = stops.find((s) => s.id === id);
      if (foundStop) {
        mapRef.current?.focusOn({ lat: foundStop.lat, lng: foundStop.lng }, 15.2);
      }
    },
    [filtered, stops],
  );

  const activeFilterCount =
    (type !== 'all' ? 1 : 0) + (line !== 'all' ? 1 : 0) + (stopFilter !== 'all' ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const clearFilters = useCallback(() => {
    setType('all');
    setLine('all');
    setStopFilter('all');
  }, []);

  /* ----- Bottom sheet panel animation (płynne przesuwanie palcem) ----- */
  const hasPreview = Boolean(selectedItem || selectedStop);
  const peekH = hasPreview ? PEEK_SELECTED : PEEK_EMPTY;
  const openH = Math.max(PEEK_SELECTED + 60, mapHeight * 0.74);
  const target = panelOpen ? openH : peekH;
  const height = useRef(new Animated.Value(target)).current;
  const panelStateRef = useRef({ panelOpen, peekH, openH });
  panelStateRef.current = { panelOpen, peekH, openH };

  const scrollYRef = useRef(0);
  const touchDragRef = useRef({ startY: 0, active: false });

  useEffect(() => {
    if (!panelOpen) scrollYRef.current = 0;
    Animated.timing(height, { toValue: target, duration: 220, useNativeDriver: false }).start();
  }, [target, height, panelOpen]);

  const handlePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 5,
        onMoveShouldSetPanResponderCapture: (_e, gs) =>
          Math.abs(gs.dy) > 7 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderMove: (_e, gs) => {
          const { panelOpen: isOpen, peekH: pH, openH: oH } = panelStateRef.current;
          const base = isOpen ? oH : pH;
          const next = Math.max(pH, Math.min(oH, base - gs.dy));
          height.setValue(next);
        },
        onPanResponderRelease: (_e, gs) => {
          const { panelOpen: isOpen, peekH: pH, openH: oH } = panelStateRef.current;
          if (gs.dy < -18) setPanelOpen(true);
          else if (gs.dy > 18) setPanelOpen(false);
          else if (Math.abs(gs.dy) < 6) setPanelOpen((v) => !v);
          else {
            const base = isOpen ? oH : pH;
            const finalH = base - gs.dy;
            setPanelOpen(finalH > (pH + oH) / 2);
          }
        },
      }),
    [height],
  );

  const bodyPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, gs) => {
          const { panelOpen: isOpen } = panelStateRef.current;
          if (!isOpen) return Math.abs(gs.dy) > 7 && Math.abs(gs.dy) > Math.abs(gs.dx);
          return gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.15 && scrollYRef.current <= 10;
        },
        onMoveShouldSetPanResponderCapture: (_e, gs) => {
          const { panelOpen: isOpen } = panelStateRef.current;
          if (!isOpen) return Math.abs(gs.dy) > 7 && Math.abs(gs.dy) > Math.abs(gs.dx);
          return gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.15 && scrollYRef.current <= 10;
        },
        onPanResponderMove: (_e, gs) => {
          const { panelOpen: isOpen, peekH: pH, openH: oH } = panelStateRef.current;
          const base = isOpen ? oH : pH;
          const next = Math.max(pH, Math.min(oH, base - gs.dy));
          height.setValue(next);
        },
        onPanResponderRelease: (_e, gs) => {
          const { panelOpen: isOpen, peekH: pH, openH: oH } = panelStateRef.current;
          if (gs.dy < -16) setPanelOpen(true);
          else if (gs.dy > 16) setPanelOpen(false);
          else {
            const base = isOpen ? oH : pH;
            const finalH = base - gs.dy;
            setPanelOpen(finalH > (pH + oH) / 2);
          }
        },
      }),
    [height],
  );

  const orderedFiltered = useMemo(() => {
    if (!selectedId) return filtered;
    const sel = filtered.find((i) => i.id === selectedId);
    if (!sel) return filtered;
    return [sel, ...filtered.filter((i) => i.id !== selectedId)];
  }, [filtered, selectedId]);

  const panelHeading =
    mapMode === 'traffic'
      ? `Utrudnienia (${loading ? '…' : filtered.length} ${pluralPl(
          filtered.length,
          'zgłoszenie',
          'zgłoszenia',
          'zgłoszeń',
        )})`
      : `Komunikaty MZK (${loading ? '…' : filtered.length} ${pluralPl(
          filtered.length,
          'komunikat',
          'komunikaty',
          'komunikatów',
        )})`;

  return (
    <View style={styles.root}>
      <ScreenHeader title="NaszToruń" subtitle={subtitle} />

      <View style={styles.mapArea} onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}>
        <TorunMap
          ref={mapRef}
          markers={loading ? [] : markers}
          polylines={loading ? [] : polylines}
          stops={loading ? [] : visibleStops}
          selectedId={selectedId}
          onSelect={handleMapSelect}
          bottomInset={peekH}
          hideControls={panelOpen}
        />

        {/* Pojedynczy przycisk filtrów w rogu mapy + przycisk zgłoszenia */}
        <CornerFilterButton
          count={activeFilterCount || undefined}
          onPress={() => setFiltersOpen(true)}
        />

        <Pressable
          onPress={() => onFab(selectedStop?.id)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={fabLabel}
          style={({ pressed }) => [styles.cornerReportBtn, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.cornerReportText}>{fabLabel}</Text>
        </Pressable>

        <Animated.View {...bodyPan.panHandlers} style={[styles.panel, { height }]}>
          <View
            {...handlePan.panHandlers}
            style={styles.handleArea}
            accessibilityLabel={panelOpen ? 'Zwiń listę' : 'Rozwiń listę'}
          >
            <View style={styles.handle} />
            <View style={styles.headRow}>
              <Text style={styles.headTitle}>{panelHeading}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.toggleText}>
                {panelOpen ? 'Przesuń w dół' : 'Przesuń w górę'}
              </Text>
              <Ionicons
                name={panelOpen ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={colors.inkSoft}
              />
            </View>
          </View>

          {panelOpen ? (
            loading ? (
              <LoadingState />
            ) : orderedFiltered.length === 0 ? (
              <EmptyState
                icon="filter-outline"
                title={emptyTitle}
                message={emptyMessage}
                actionLabel={hasFilters ? 'Wyczyść filtry' : undefined}
                onAction={hasFilters ? clearFilters : undefined}
              />
            ) : (
              <FlatList
                data={orderedFiltered}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                bounces={false}
                overScrollMode="never"
                onScroll={(e) => {
                  scrollYRef.current = e.nativeEvent.contentOffset.y;
                }}
                onTouchStart={(e) => {
                  touchDragRef.current = {
                    startY: e.nativeEvent.pageY ?? 0,
                    active: scrollYRef.current <= 10,
                  };
                }}
                onTouchMove={(e) => {
                  const y = e.nativeEvent.pageY ?? 0;
                  if (!touchDragRef.current.active) {
                    if (scrollYRef.current <= 2) {
                      touchDragRef.current = { startY: y, active: true };
                    }
                    return;
                  }
                  const dy = y - touchDragRef.current.startY;
                  if (dy > 8) {
                    const { peekH: pH, openH: oH } = panelStateRef.current;
                    height.setValue(Math.max(pH, Math.min(oH, oH - dy)));
                  }
                }}
                onTouchEnd={(e) => {
                  if (!touchDragRef.current.active) return;
                  const dy = (e.nativeEvent.pageY ?? 0) - touchDragRef.current.startY;
                  touchDragRef.current.active = false;
                  if (dy > 24) {
                    setPanelOpen(false);
                  } else if (dy > 0) {
                    Animated.timing(height, {
                      toValue: panelStateRef.current.openH,
                      duration: 180,
                      useNativeDriver: false,
                    }).start();
                  }
                }}
                renderItem={({ item }) => (
                  <BoardCard
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={() => focusItemOnMap(item)}
                    onShowOnMap={() => focusItemOnMap(item)}
                  />
                )}
              />
            )
          ) : selectedItem ? (
            <View style={styles.preview}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedItem.title} · {selectedItem.lengthLabel}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {selectedItem.where} · {selectedItem.impact} ({selectedItem.status})
                </Text>
              </View>
              <View style={styles.swipeHintPill}>
                <Ionicons name="chevron-up" size={14} color={colors.inkSoft} />
                <Text style={styles.swipeHintText}>Szczegóły</Text>
              </View>
              <Pressable
                onPress={() => setSelectedId(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Zamknij podgląd"
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : selectedStop ? (
            <View style={styles.preview}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  Przystanek: {selectedStop.name}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  Obsługiwane linie: {selectedStop.lines.join(', ')}
                </Text>
              </View>
              <Button
                label="Zgłoś tutaj"
                icon="alert-circle-outline"
                small
                onPress={() => onFab(selectedStop.id)}
              />
              <Pressable
                onPress={() => setSelectedId(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Zamknij podgląd przystanku"
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* Wysuwane menu filtrów z pojedynczego przycisku w rogu mapy */}
      <Sheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={`Filtry — ${title}`}
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Wyczyść"
              variant="secondary"
              onPress={clearFilters}
              style={{ flex: 1 }}
            />
            <Button
              label={`Pokaż na mapie (${filtered.length})`}
              onPress={() => setFiltersOpen(false)}
              style={{ flex: 2 }}
            />
          </View>
        }
      >
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupTitle}>Kategoria</Text>
          <View style={styles.filterWrap}>
            {typeFilters.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                icon={opt.icon}
                selected={type === opt.key}
                onPress={() => setType(opt.key)}
              />
            ))}
          </View>
        </View>

        {lineFilters && lineFilters.length > 0 ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Linia MZK</Text>
            <View style={styles.filterWrap}>
              <Chip
                label="Wszystkie linie"
                selected={line === 'all'}
                onPress={() => setLine('all')}
              />
              {lineFilters.map((l) => (
                <Chip
                  key={`line-${l}`}
                  label={`Linia ${l}`}
                  icon="bus-outline"
                  selected={line === l}
                  onPress={() => setLine((prev) => (prev === l ? 'all' : l))}
                />
              ))}
            </View>
          </View>
        ) : null}

        {stops.length > 0 ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Przystanek</Text>
            <View style={styles.filterWrap}>
              <Chip
                label="Wszystkie przystanki"
                selected={stopFilter === 'all'}
                onPress={() => setStopFilter('all')}
              />
              {stops
                .filter((s) => line === 'all' || s.lines.includes(line))
                .map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    icon="location-outline"
                    selected={stopFilter === s.id}
                    onPress={() => {
                      const next = stopFilter === s.id ? 'all' : s.id;
                      setStopFilter(next);
                      if (next !== 'all') {
                        setSelectedId(s.id);
                        mapRef.current?.focusOn({ lat: s.lat, lng: s.lng }, 15.2);
                      }
                    }}
                  />
                ))}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  mapArea: { flex: 1 },
  cornerReportBtn: {
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
  cornerReportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    overflow: 'hidden',
    ...shadow.float,
  },
  handleArea: { paddingTop: 10, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  headTitle: { ...font.bodyBold, color: colors.ink },
  toggleText: { ...font.small, color: colors.inkSoft },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 52 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
  },
  previewTitle: { ...font.bodyBold, color: colors.ink },
  previewMeta: { ...font.small, color: colors.muted, marginTop: 2 },
  swipeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 },
  impactPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '46%',
  },
  impactPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  lineBadge: {
    backgroundColor: colors.river,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lineText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  title: { ...font.h3, color: colors.ink },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  whereText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft, flex: 1 },
  desc: { ...font.small, color: colors.muted, marginTop: 5 },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  statusText: { fontSize: 11, fontWeight: '500', color: colors.muted, flexShrink: 1 },
  mapHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  mapHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  filterGroup: { marginBottom: spacing.lg },
  filterGroupTitle: { ...font.bodyBold, color: colors.ink, marginBottom: 8 },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
