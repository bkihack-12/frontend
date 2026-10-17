import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META } from '../data/events';
import { formatDateTime, formatPrice } from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { colors, radius, shadow, spacing } from '../theme';

export function PlacesBar({ left, capacity }: { left: number; capacity: number }) {
  const ratio = capacity > 0 ? left / capacity : 0;
  const sold = left === 0;
  const color = sold ? colors.danger : ratio <= 0.15 ? colors.warning : colors.success;
  return (
    <View>
      <View style={styles.placesRow}>
        <Text style={[styles.placesText, { color }]}>
          {sold ? 'Brak miejsc' : `Wolne miejsca: ${left} / ${capacity}`}
        </Text>
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.max(4, (1 - ratio) * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export function actionLabel(e: { action?: 'register' | 'ticket'; priceZl?: number }): string {
  return e.action === 'ticket'
    ? `Kup bilet${e.priceZl ? ` · ${formatPrice(e.priceZl)}` : ''}`
    : 'Zapisz się';
}

/** Etykieta zniżki / wstępu wyświetlana wyłącznie w szczegółach wydarzenia. */
export function eventDiscountTag(e: { isFree: boolean; priceZl?: number; category: string }): string {
  if (e.isFree) return 'Wstęp bezpłatny (0 zł)';
  if (e.category === 'kultura' || e.category === 'muzyka') return 'Zniżka −30% z PIT w Toruniu';
  if (e.category === 'sport' || e.category === 'rodzina') return 'Zniżka −25% z PIT w Toruniu';
  return 'Zniżka −20% z PIT w Toruniu';
}

export function EventCard({
  event,
  onOpen,
  onDelete,
  highlight,
}: {
  event: EventWithDistance;
  onOpen: () => void;
  onShowOnMap?: () => void;
  onDelete?: () => void;
  highlight?: boolean;
}) {
  const meta = CATEGORY_META[event.category];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.venue}`}
      style={({ pressed }) => [
        styles.gridTile,
        highlight && { borderColor: colors.brick, backgroundColor: '#FDFBFB' },
        pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.catBadge, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as never} size={15} color={meta.color} />
        </View>
        <Text style={styles.dateText} numberOfLines={1}>
          {formatDateTime(event.startsAt)}
        </Text>
        {onDelete ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onDelete();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Usuń ${event.title}`}
            style={styles.trashBtn}
          >
            <Ionicons name="trash-outline" size={14} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.venueText} numberOfLines={1}>
          {event.venue}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'space-between',
    gap: 10,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  catBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    flex: 1,
    textAlign: 'right',
  },
  trashBtn: {
    padding: 4,
    marginLeft: 2,
  },
  textGroup: {
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
  },
  venueText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
  },
  placesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  placesText: { fontSize: 12, fontWeight: '600' },
  bar: { height: 5, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: radius.pill },
});
