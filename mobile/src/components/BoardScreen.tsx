import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
  fabLabel,
  onFab,
  emptyTitle,
  emptyMessage,
}: Props) {
  const [type, setType] = useState('all');
  const [line, setLine] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<TorunMapHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

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
          label: it.lines?.length ? `L${it.lines.join('/')} · ${it.lengthLabel}` : it.lengthLabel,
          dashed: it.typeKey === 'roadworks' || it.typeKey === 'reroute',
        }))
      : [];
    const refLines = extraPolylines.filter((r) => line === 'all' || r.id === `ref-${line}`);
    return [...refLines, ...activeLines];
  }, [filtered, extraPolylines, line, showItemPaths]);

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

      {/* Mapa z zaznaczonymi lokacjami i długościami odcinków */}
      <View style={[styles.mapWrap, { height: mapExpanded ? 320 : 210 }]}>
        <TorunMap
          ref={mapRef}
          markers={markers}
          polylines={polylines}
          selectedId={selectedId}
          onSelect={handleSelect}
          bottomInset={8}
        />
        <Pressable
          onPress={() => setMapExpanded((v) => !v)}
          style={styles.expandMapBtn}
          accessibilityRole="button"
          accessibilityLabel={mapExpanded ? 'Pomniejsz mapę' : 'Powiększ mapę'}
        >
          <Ionicons name={mapExpanded ? 'contract-outline' : 'expand-outline'} size={14} color={colors.inkSoft} />
          <Text style={styles.expandMapText}>{mapExpanded ? 'Mniejsza mapa' : 'Większa mapa'}</Text>
        </Pressable>
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
  expandMapBtn: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  expandMapText: { fontSize: 11, fontWeight: '600', color: colors.inkSoft },
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
