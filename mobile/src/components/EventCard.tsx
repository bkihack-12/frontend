import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META } from '../data/events';
import { formatDateTime, formatPrice } from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { useAppData } from '../state/AppDataContext';
import { colors, font, radius, shadow, spacing } from '../theme';

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
        <View style={[styles.barFill, { width: `${Math.max(4, (1 - ratio) * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function actionLabel(e: { action?: 'register' | 'ticket'; priceZl?: number }): string {
  return e.action === 'ticket'
    ? `Kup bilet${e.priceZl ? ` · ${formatPrice(e.priceZl)}` : ''}`
    : 'Zapisz się';
}

/** Wylicza wyróżnioną etykietę zniżki / wstępu wyświetlaną na kafelku w gridzie. */
export function eventDiscountTag(e: { isFree: boolean; priceZl?: number; category: string }): string {
  if (e.isFree) return 'Wstęp 0 zł (100% taniej)';
  if (e.category === 'kultura' || e.category === 'muzyka') return '−30% z PIT w Toruniu';
  if (e.category === 'sport' || e.category === 'rodzina') return '−25% z PIT w Toruniu';
  return '−20% z PIT w Toruniu';
}

export function EventCard({
  event,
  onOpen,
  highlight,
}: {
  event: EventWithDistance;
  onOpen: () => void;
  onShowOnMap?: () => void;
  highlight?: boolean;
}) {
  const { isInterested, getBooking } = useAppData();
  const meta = CATEGORY_META[event.category];
  const booking = getBooking(event.id);
  const interested = isInterested(event.id);
  const discountLabel = event.isFree ? '0 zł · Bezpłatne' : eventDiscountTag(event);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={event.title}
      style={({ pressed }) => [
        styles.gridTile,
        highlight && { borderColor: colors.brick, backgroundColor: '#FDFBFB' },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.discountPill, event.isFree && styles.discountPillFree]}>
          <Text
            style={[styles.discountPillText, event.isFree && styles.discountPillTextFree]}
            numberOfLines={1}
          >
            {discountLabel}
          </Text>
        </View>
        <View style={[styles.catCircle, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon as never} size={15} color={meta.color} />
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>

      <View style={styles.bottomRow}>
        <Text style={styles.metaLine} numberOfLines={1}>
          {meta.label} · {event.venue}
        </Text>
        <Text style={styles.dateLine} numberOfLines={1}>
          {formatDateTime(event.startsAt)}
          {booking ? ' · Zapisano ✓' : interested ? ' · Ulubione ♥' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 145,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'space-between',
    gap: 8,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  discountPill: {
    backgroundColor: colors.brickSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.md,
    flexShrink: 1,
  },
  discountPillFree: {
    backgroundColor: colors.successSoft,
  },
  discountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brickDark,
  },
  discountPillTextFree: {
    color: colors.success,
  },
  catCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...font.bodyBold,
    color: colors.ink,
    lineHeight: 19,
  },
  bottomRow: {
    gap: 2,
  },
  metaLine: { ...font.tiny, color: colors.inkSoft },
  dateLine: { fontSize: 11, color: colors.muted },
  placesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  placesText: { fontSize: 12, fontWeight: '600' },
  bar: { height: 5, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: radius.pill },
});
