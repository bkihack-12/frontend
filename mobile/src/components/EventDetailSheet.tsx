import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, InlineNotice, MetaRow, Sheet } from './ui';
import { PlacesBar, actionLabel } from './EventCard';
import { CATEGORY_META } from '../data/events';
import {
  formatDateTime,
  formatDistance,
  formatPrice,
  formatTime,
  pluralPl,
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
}

export function EventDetailSheet({ event, onClose, onShowOnMap, onNeedAuth }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { placesLeft, getBooking, bookEvent, cancelBooking, interestedCount, isInterested, toggleInterested } =
    useAppData();
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

  let footer: React.ReactNode;
  if (event.type === 'open') {
    footer = (
      <Button
        label={interested ? 'Zainteresowany ✓' : 'Interesuje mnie'}
        icon={interested ? 'heart' : 'heart-outline'}
        variant={interested ? 'primary' : 'secondary'}
        onPress={() => {
          const now = toggleInterested(event.id);
          showToast(now ? 'Dodano do zainteresowań' : 'Usunięto z zainteresowań', now ? 'success' : 'info');
        }}
      />
    );
  } else if (booking) {
    footer =
      step === 'cancelConfirm' || step === 'cancelBusy' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
          onPress={() => setStep('cancelConfirm')}
        />
      );
  } else if (left === 0) {
    footer = <Button label="Brak wolnych miejsc" variant="secondary" disabled onPress={() => {}} />;
  } else if (!user) {
    footer = (
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.authPrompt}>Zaloguj się, aby zarezerwować miejsce.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Zaloguj się" onPress={() => onNeedAuth('login', event)} style={{ flex: 1 }} />
          <Button
            label="Załóż konto"
            variant="secondary"
            onPress={() => onNeedAuth('register', event)}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  } else if (step === 'confirm' || step === 'busy') {
    footer = (
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
    footer = (
      <Button
        label={actionLabel(event)}
        icon={isTicket ? 'ticket-outline' : 'checkmark-circle-outline'}
        onPress={() => setStep('confirm')}
      />
    );
  }

  return (
    <Sheet visible onClose={onClose} title={event.title} footer={footer}>
      <View style={styles.badges}>
        <Badge label={meta.label} color={meta.color} bg="#F3F4F6" />
        <Badge
          label={event.isFree ? 'Bezpłatne' : formatPrice(event.priceZl ?? 0)}
          color={event.isFree ? colors.success : colors.inkSoft}
          bg={event.isFree ? colors.successSoft : '#F3F4F6'}
        />
      </View>

      {booking ? (
        <View style={styles.bookedBanner}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.bookedText}>Rezerwacja aktywna · kod: {booking.code}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={{ marginBottom: spacing.sm }}>
          <InlineNotice kind="error" text={error} />
        </View>
      ) : null}

      <View style={styles.info}>
        <MetaRow icon="calendar-outline" text={`${formatDateTime(event.startsAt)}–${formatTime(event.endsAt)}`} />
        <MetaRow icon="location-outline" text={`${event.venue}, ${event.address} (${formatDistance(event.distanceKm)})`} />
        <MetaRow
          icon="people-outline"
          text={`${count} ${pluralPl(count, 'osoba zainteresowana', 'osoby zainteresowane', 'osób zainteresowanych')}`}
        />
      </View>

      {left !== undefined && event.capacity ? (
        <View style={styles.places}>
          <PlacesBar left={left} capacity={event.capacity} />
        </View>
      ) : null}

      <Text style={styles.desc}>{event.description}</Text>

      {onShowOnMap ? (
        <Button
          label="Pokaż na mapie"
          icon="map-outline"
          variant="ghost"
          small
          onPress={() => onShowOnMap(event)}
          style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  bookedBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  bookedText: { ...font.small, color: colors.success, fontWeight: '600' },
  info: {
    gap: 6,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  places: {
    marginTop: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  desc: { ...font.body, color: colors.inkSoft, marginTop: spacing.md },
  authPrompt: { ...font.small, color: colors.inkSoft, textAlign: 'center' },
});
