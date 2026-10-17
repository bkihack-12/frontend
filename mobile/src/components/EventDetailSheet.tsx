import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, InlineNotice, Sheet } from './ui';
import { PlacesBar, actionLabel, eventDiscountTag } from './EventCard';
import { CATEGORY_META } from '../data/events';
import {
  formatDateTime,
  formatDistance,
  formatPrice,
  formatTime,
} from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { useAppData } from '../state/AppDataContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, font, radius, spacing } from '../theme';

type Step = 'idle' | 'confirm' | 'busy' | 'cancelConfirm' | 'cancelBusy';

interface Props {
  event: EventWithDistance | null;
  onClose: () => void;
  onShowOnMap?: (e: EventWithDistance) => void;
  onNeedAuth: (mode: 'login' | 'register', event: EventWithDistance) => void;
  taxVerified?: boolean;
  onOpenTaxForm?: () => void;
}

export function EventDetailSheet({
  event,
  onClose,
  onShowOnMap,
  onNeedAuth,
  taxVerified,
  onOpenTaxForm,
}: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    placesLeft,
    getBooking,
    bookEvent,
    cancelBooking,
    interestedCount,
    isInterested,
    toggleInterested,
    deleteEvent,
  } = useAppData();
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setStep('idle');
    setError('');
  }, [event?.id]);

  if (!event) return null;

  const meta = CATEGORY_META[event.category];
  const left = placesLeft(event);
  const booking = getBooking(event.id);
  const interested = isInterested(event.id);
  const count = interestedCount(event);
  const isTicket = event.action === 'ticket';
  const discountLabel = eventDiscountTag(event);

  const handleDelete = () => {
    deleteEvent(event.id);
    onClose();
    showToast('Usunięto wydarzenie', 'info');
  };

  const doBook = async () => {
    if (!user) return;
    setStep('busy');
    setError('');
    const res = await bookEvent(event.id, user);
    if (res.ok) {
      setStep('idle');
      showToast(isTicket ? 'Bilet zarezerwowany' : 'Zapisano na wydarzenie');
    } else {
      setStep('idle');
      setError(res.error);
    }
  };

  const doCancel = async () => {
    if (!user) return;
    setStep('cancelBusy');
    await cancelBooking(event.id, user);
    setStep('idle');
    showToast('Anulowano rezerwację', 'info');
  };

  let primaryAction: React.ReactNode;
  if (event.type === 'open') {
    primaryAction = (
      <Button
        label={interested ? 'Zainteresowany ✓' : 'Interesuje mnie'}
        icon={interested ? 'heart' : 'heart-outline'}
        variant={interested ? 'primary' : 'secondary'}
        style={{ flex: 1 }}
        onPress={() => {
          const now = toggleInterested(event.id);
          showToast(now ? 'Dodano do zainteresowań' : 'Usunięto z zainteresowań', now ? 'success' : 'info');
        }}
      />
    );
  } else if (booking) {
    primaryAction =
      step === 'cancelConfirm' || step === 'cancelBusy' ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Zostaw"
            variant="secondary"
            onPress={() => setStep('idle')}
            disabled={step === 'cancelBusy'}
            style={{ flex: 1 }}
          />
          <Button
            label="Odwołaj rezerwację"
            variant="danger"
            onPress={doCancel}
            loading={step === 'cancelBusy'}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <Button
          label={isTicket ? 'Zrezygnuj z biletu' : 'Wypisz się'}
          variant="danger"
          style={{ flex: 1 }}
          onPress={() => setStep('cancelConfirm')}
        />
      );
  } else if (left === 0) {
    primaryAction = (
      <Button label="Brak wolnych miejsc" variant="secondary" disabled onPress={() => {}} style={{ flex: 1 }} />
    );
  } else if (!user) {
    primaryAction = (
      <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
        <Button label="Zaloguj i zarezerwuj" onPress={() => onNeedAuth('login', event)} style={{ flex: 1 }} />
        <Button
          label="Załóż konto"
          variant="secondary"
          onPress={() => onNeedAuth('register', event)}
          style={{ flex: 1 }}
        />
      </View>
    );
  } else if (step === 'confirm' || step === 'busy') {
    primaryAction = (
      <View style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Anuluj"
          variant="secondary"
          onPress={() => setStep('idle')}
          disabled={step === 'busy'}
          style={{ flex: 1 }}
        />
        <Button label="Potwierdź rezerwację" onPress={doBook} loading={step === 'busy'} style={{ flex: 2 }} />
      </View>
    );
  } else {
    primaryAction = (
      <Button
        label={actionLabel(event)}
        icon={isTicket ? 'ticket-outline' : 'checkmark-circle-outline'}
        style={{ flex: 1 }}
        onPress={() => setStep('confirm')}
      />
    );
  }

  const footer = (
    <View style={styles.footerRow}>
      {primaryAction}
      <Pressable
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Usuń wydarzenie"
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Usuń</Text>
      </Pressable>
    </View>
  );

  return (
    <Sheet visible onClose={onClose} title={event.title} footer={footer}>
      {/* Hero Box: Zniżka + Gdzie i Kiedy */}
      <View style={[styles.heroCard, event.isFree && styles.heroCardFree]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={[styles.heroDiscountBig, event.isFree && { color: colors.success }]}>
              {discountLabel}
            </Text>
            {!event.isFree && event.priceZl ? (
              <Text style={styles.regularPrice}>Cena regularna: {formatPrice(event.priceZl)}</Text>
            ) : null}
          </View>
          <Badge label={meta.label} color={meta.color} bg={colors.surface} icon={meta.icon as never} />
        </View>

        <View style={styles.whereWhenCard}>
          <View style={styles.whereRow}>
            <Ionicons name="location" size={16} color={colors.brick} />
            <View style={{ flex: 1 }}>
              <Text style={styles.whereVenue}>{event.venue}</Text>
              <Text style={styles.whereAddress}>
                {event.address} · {formatDistance(event.distanceKm)}
              </Text>
            </View>
            {onShowOnMap ? (
              <Pressable onPress={() => onShowOnMap(event)} style={styles.mapPill}>
                <Ionicons name="map-outline" size={13} color={colors.brick} />
                <Text style={styles.mapPillText}>Mapa</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.whenRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.river} />
            <Text style={styles.whenText}>
              {formatDateTime(event.startsAt)}–{formatTime(event.endsAt)}
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="people-outline" size={15} color={colors.muted} />
            <Text style={styles.peopleCount}>{count}</Text>
          </View>
        </View>
      </View>

      {booking ? (
        <View style={styles.bookedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.bookedText}>Rezerwacja aktywna · kod: {booking.code}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={{ marginBottom: spacing.sm }}>
          <InlineNotice kind="error" text={error} />
        </View>
      ) : null}

      {left !== undefined && event.capacity ? (
        <View style={styles.places}>
          <PlacesBar left={left} capacity={event.capacity} />
        </View>
      ) : null}

      <Text style={styles.desc}>{event.description}</Text>

      {!event.isFree && !taxVerified && onOpenTaxForm ? (
        <Pressable
          onPress={() => {
            onClose();
            setTimeout(onOpenTaxForm, 220);
          }}
          style={styles.taxMiniBar}
        >
          <Ionicons name="id-card-outline" size={16} color={colors.brick} />
          <Text style={styles.taxMiniText}>Potwierdź PIT w Toruniu, aby naliczyć ulgę na bilet</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.brick} />
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.brickSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroCardFree: {
    backgroundColor: colors.successSoft,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroDiscountBig: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
    color: colors.brickDark,
  },
  regularPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    marginTop: 2,
  },
  whereWhenCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 8,
  },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whereVenue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  whereAddress: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brickSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  mapPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brickDark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whenText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  peopleCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  bookedBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bookedText: { ...font.small, color: colors.success, fontWeight: '700' },
  places: {
    marginBottom: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  desc: { ...font.body, color: colors.inkSoft },
  taxMiniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  taxMiniText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F3C1BC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});
