import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card } from './ui';
import { CATEGORY_META } from '../data/events';
import { formatDateTime, formatDistance, formatPrice, pluralPl } from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { useAppData } from '../state/AppDataContext';
import { colors, font, radius, spacing } from '../theme';

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

export function EventCard({
  event,
  onOpen,
  onShowOnMap,
  highlight,
}: {
  event: EventWithDistance;
  onOpen: () => void;
  onShowOnMap?: () => void;
  highlight?: boolean;
}) {
  const { interestedCount, isInterested, toggleInterested, placesLeft, getBooking } = useAppData();
  const meta = CATEGORY_META[event.category];
  const left = placesLeft(event);
  const booking = getBooking(event.id);
  const interested = isInterested(event.id);

  return (
    <Card
      onPress={onOpen}
      accessibilityLabel={event.title}
      style={[styles.card, highlight && { borderColor: colors.brick }]}
    >
      <View style={styles.topRow}>
        <Badge label={meta.label} color={meta.color} bg="#F3F4F6" />
        <Text style={styles.priceText}>
          {event.isFree ? 'Bezpłatne' : formatPrice(event.priceZl ?? 0)}
        </Text>
      </View>

      <Text style={styles.title}>{event.title}</Text>

      <Text style={styles.metaLine} numberOfLines={1}>
        {formatDateTime(event.startsAt)} · {event.venue} ({formatDistance(event.distanceKm)})
      </Text>

      <Text style={styles.desc} numberOfLines={2}>
        {event.description}
      </Text>

      {left !== undefined && event.capacity ? (
        <View style={{ marginTop: spacing.sm }}>
          <PlacesBar left={left} capacity={event.capacity} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.interestRow}>
          <Ionicons name="people-outline" size={14} color={colors.muted} />
          <Text style={styles.interestText}>
            {interestedCount(event)} {pluralPl(interestedCount(event), 'chętny', 'chętnych', 'chętnych')}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {onShowOnMap ? (
          <Button label="Mapa" icon="location-outline" variant="ghost" small onPress={onShowOnMap} />
        ) : null}
        {event.type === 'open' ? (
          <Button
            label={interested ? 'Zainteresowany' : 'Interesuje mnie'}
            icon={interested ? 'heart' : 'heart-outline'}
            variant={interested ? 'primary' : 'secondary'}
            small
            onPress={() => toggleInterested(event.id)}
          />
        ) : booking ? (
          <Button label="Zapisano" icon="checkmark" variant="river" small onPress={onOpen} />
        ) : left === 0 ? (
          <Button label="Brak miejsc" variant="secondary" small onPress={onOpen} />
        ) : (
          <Button label={actionLabel(event)} small onPress={onOpen} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priceText: { ...font.small, color: colors.inkSoft, fontWeight: '600' },
  title: { ...font.h3, color: colors.ink, marginBottom: 4 },
  metaLine: { ...font.small, color: colors.muted },
  desc: { ...font.body, color: colors.inkSoft, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  interestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  interestText: { ...font.small, color: colors.muted },
  placesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  placesText: { fontSize: 12, fontWeight: '600' },
  bar: { height: 5, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: radius.pill },
});
