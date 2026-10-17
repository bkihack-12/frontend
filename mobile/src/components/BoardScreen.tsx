import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Chip, ChipRow, EmptyState, LoadingState } from './ui';
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
        <ChipRow>
          {typeFilters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              icon={f.icon}
              selected={type === f.key}
              onPress={() => setType(f.key)}
            />
          ))}
        </ChipRow>
        {lineFilters ? (
          <View style={{ marginTop: 6 }}>
            <ChipRow>
              <Chip label="Wszystkie linie" selected={line === 'all'} onPress={() => setLine('all')} />
              {lineFilters.map((l) => (
                <Chip key={l} label={`Linia ${l}`} selected={line === l} onPress={() => setLine(l)} />
              ))}
            </ChipRow>
          </View>
        ) : null}
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
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
