import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, EmptyState, LoadingState } from './ui';
import { ScreenHeader } from './ScreenHeader';
import { MapMarkerItem, MapPolylineItem, TorunMap, TorunMapHandle } from './TorunMap';
import { formatAgo } from '../lib/format';
import type { MapPoint, Severity } from '../types';
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

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: BoardFilterOption[];
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.key === value) ?? options[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.filterSelect, pressed && { opacity: 0.82 }]}
      >
        <Text style={styles.filterSelectLabel}>{label}</Text>
        <Text style={styles.filterSelectValue} numberOfLines={1}>
          {selected.label}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.inkSoft} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.filterModalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.filterPanel} onPress={(event) => event.stopPropagation()}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zamknij wybór filtra"
                onPress={() => setOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.inkSoft} />
              </Pressable>
            </View>
            <View style={styles.filterTiles}>
              {options.map((option) => {
                const isSelected = option.key === value;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.filterTile,
                      isSelected && styles.filterTileSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {option.icon ? (
                      <Ionicons
                        name={option.icon}
                        size={17}
                        color={isSelected ? colors.brick : colors.inkSoft}
                        style={styles.filterTileIcon}
                      />
                    ) : null}
                    <Text
                      style={[styles.filterTileText, isSelected && styles.filterTileTextSelected]}
                      numberOfLines={2}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function BoardCard({
  item,
  selected,
  onSelect,
}: {
  item: BoardItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
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
              <Text style={styles.lineText}>Linia {l}</Text>
            </View>
          ))}
          <Badge label={item.typeLabel} color={item.color} bg="#F3F4F6" />
        </View>
        <Text style={styles.timeText}>{formatAgo(item.reportedAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.whereText} numberOfLines={1}>
        {item.where}
      </Text>

      <View style={styles.footerRow}>
        <Text style={[styles.impactText, { color: item.color }]} numberOfLines={1}>
          {item.impact}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.statusText} numberOfLines={1}>
          {item.status}
        </Text>
      </View>

      {selected ? <Text style={styles.desc}>{item.description}</Text> : null}
    </Pressable>
  );
}

interface Props {
  title: string;
  subtitle?: string;
  items: BoardItem[];
  typeFilters: BoardFilterOption[];
  lineFilters?: string[];
  extraPolylines?: MapPolylineItem[];
  showItemPaths?: boolean;
  mapMode?: 'traffic' | 'transit';
  fabLabel: string;
  onFab: () => void;
  emptyTitle: string;
  emptyMessage: string;
}

export function BoardScreen({
  title,
  subtitle,
  items,
  typeFilters,
  lineFilters,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<TorunMapHandle>(null);
  const mapHeight = useRef(new Animated.Value(290)).current;
  const mapCollapsed = useRef(false);
  const mapAnimating = useRef(false);
  const scrollStartY = useRef<number | null>(null);
  const settledScrollY = useRef(0);
  const latestScrollY = useRef(0);
  const suppressScrollUntil = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
    },
    [],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const setMapCollapsed = useCallback(
    (collapsed: boolean) => {
      if (mapCollapsed.current === collapsed) return;
      mapCollapsed.current = collapsed;
      settledScrollY.current = latestScrollY.current;
      mapAnimating.current = true;
      suppressScrollUntil.current = Date.now() + 500;
      Animated.timing(mapHeight, {
        toValue: collapsed ? 155 : 290,
        duration: 220,
        useNativeDriver: false,
      }).start(() => {
        mapAnimating.current = false;
      });
    },
    [mapHeight],
  );

  const onListScroll = useCallback(
    (event: Parameters<NonNullable<React.ComponentProps<typeof FlatList>['onScroll']>>[0]) => {
      const currentTarget = event.currentTarget as unknown as { scrollTop?: number };
      const y = event.nativeEvent?.contentOffset?.y ?? currentTarget.scrollTop;
      if (typeof y !== 'number') return;
      if (mapAnimating.current || Date.now() < suppressScrollUntil.current) {
        latestScrollY.current = y;
        settledScrollY.current = y;
        scrollStartY.current = null;
        return;
      }

      latestScrollY.current = y;
      if (scrollStartY.current === null) scrollStartY.current = settledScrollY.current;
      if (snapTimer.current) clearTimeout(snapTimer.current);

      // Poczekaj, aż pojedynczy gest/koło przewijania się zakończy. Dopiero wtedy
      // wybierz jeden z dwóch stanów, zamiast zmieniać wysokość podczas ruchu.
      snapTimer.current = setTimeout(() => {
        const start = scrollStartY.current;
        const end = latestScrollY.current;
        scrollStartY.current = null;
        settledScrollY.current = end;
        snapTimer.current = null;
        if (start !== null && Math.abs(end - start) >= 12) {
          setMapCollapsed(end > start);
        }
      }, 180);
    },
    [setMapCollapsed],
  );

  const filtered = useMemo(
    () =>
      items
        .filter((it) => type === 'all' || it.typeKey === type)
        .filter((it) => line === 'all' || it.lines?.includes(line))
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    [items, type, line],
  );

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
    const activeLines = showItemPaths
      ? filtered.map((it) => ({
          id: it.id,
          path: it.path,
          color: it.color,
          label: it.lines?.length
            ? `L${it.lines.join('/')} · ${it.lengthLabel}`
            : `${it.typeLabel} · ${it.lengthLabel}`,
          dashed: mapMode === 'traffic' || it.typeKey === 'reroute',
        }))
      : [];
    const refLines = extraPolylines.filter((r) => line === 'all' || r.id === `ref-${line}`);
    return [...refLines, ...activeLines];
  }, [filtered, extraPolylines, line, mapMode, showItemPaths]);

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) {
        const found = filtered.find((x) => x.id === id);
        if (found) {
          mapRef.current?.focusOn({ lat: found.lat, lng: found.lng }, 14.8);
        }
      }
    },
    [filtered],
  );

  return (
    <View style={styles.root}>
      <ScreenHeader title={title} subtitle={subtitle} />

      <View style={styles.filters}>
        <View style={styles.filterControls}>
          <FilterDropdown label="Rodzaj" value={type} options={typeFilters} onChange={setType} />
          {lineFilters ? (
            <FilterDropdown
              label="Linia"
              value={line}
              options={[
                { key: 'all', label: 'Wszystkie linie' },
                ...lineFilters.map((l) => ({ key: l, label: `Linia ${l}` })),
              ]}
              onChange={setLine}
            />
          ) : null}
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <BoardCard
              item={item}
              selected={item.id === selectedId}
              onSelect={() => handleSelect(selectedId === item.id ? null : item.id)}
            />
          )}
          ListHeaderComponent={
            <Animated.View
              style={[
                styles.mapWrap,
                styles.mapHeader,
                {
                  height: mapHeight,
                },
              ]}
            >
              <TorunMap
                ref={mapRef}
                markers={markers}
                polylines={polylines}
                selectedId={selectedId}
                onSelect={handleSelect}
                bottomInset={8}
              />
              <View
                style={[
                  styles.mapModeBadge,
                  mapMode === 'traffic' ? styles.trafficMapBadge : styles.transitMapBadge,
                ]}
                pointerEvents="none"
              >
                <View
                  style={[
                    styles.mapModeDot,
                    { backgroundColor: mapMode === 'traffic' ? '#9F1239' : '#1D4ED8' },
                  ]}
                />
                <Text style={styles.mapModeTitle}>{mapMode === 'traffic' ? 'RUCH' : 'MZK'}</Text>
              </View>
            </Animated.View>
          }
          stickyHeaderIndices={[0]}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brick} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="filter-outline"
              title={emptyTitle}
              message={emptyMessage}
              actionLabel="Pokaż wszystko"
              onAction={() => {
                setType('all');
                setLine('all');
              }}
            />
          }
          ListFooterComponent={<View style={{ height: 76 }} />}
        />
      )}

      <Pressable
        onPress={onFab}
        accessibilityRole="button"
        accessibilityLabel={fabLabel}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.fabText}>{fabLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  filters: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  filterControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterSelect: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterSelectLabel: {
    ...font.tiny,
    color: colors.muted,
  },
  filterSelectValue: {
    flex: 1,
    minWidth: 0,
    ...font.small,
    color: colors.ink,
  },
  filterModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  filterPanel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterPanelTitle: {
    ...font.h2,
    color: colors.ink,
  },
  filterTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterTile: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterTileSelected: {
    backgroundColor: colors.brickSoft,
    borderColor: '#E5BFB8',
  },
  filterTileIcon: {
    alignSelf: 'center',
  },
  filterTileText: {
    ...font.small,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  filterTileTextSelected: {
    color: colors.brickDark,
    fontWeight: '600',
  },
  mapWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: '#EEF1F5',
  },
  mapHeader: { marginHorizontal: -spacing.md, marginTop: -spacing.md },
  mapModeBadge: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    ...shadow.card,
  },
  trafficMapBadge: { backgroundColor: 'rgba(255,244,246,0.96)', borderColor: '#F2B8C3' },
  transitMapBadge: { backgroundColor: 'rgba(239,246,255,0.96)', borderColor: '#A9C7F5' },
  mapModeDot: { width: 8, height: 8, borderRadius: 4 },
  mapModeTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.ink },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 },
  timeText: { ...font.small, color: colors.muted, marginLeft: 8 },
  lineBadge: {
    backgroundColor: colors.river,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lineText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  title: { ...font.h3, color: colors.ink },
  whereText: { ...font.small, color: colors.inkSoft, marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  impactText: { ...font.small, fontWeight: '600', flexShrink: 1 },
  dot: { color: colors.muted, fontSize: 12 },
  statusText: { ...font.small, color: colors.muted, flexShrink: 1 },
  desc: {
    ...font.body,
    color: colors.inkSoft,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.brick,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadow.float,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
