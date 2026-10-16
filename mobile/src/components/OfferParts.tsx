import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, MetaRow, Sheet } from './ui';
import { KIND_META, OFFER_CATEGORY_LABEL } from '../data/offers';
import { formatLongDate } from '../lib/format';
import type { CityOffer, ResidentBenefit } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';
import { colors, font, radius, spacing } from '../theme';

export function ResidentBenefitsSection({ benefits }: { benefits: ResidentBenefit[] }) {
  return (
    <View style={styles.benefitsContainer}>
      <View style={styles.benefitsHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="id-card-outline" size={20} color={colors.river} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.benefitsTitle}>Benefity dla mieszkańców Torunia</Text>
          <Text style={styles.benefitsSub}>
            Toruńska Karta Miejska — zniżki na komunikację, kulturę, sport i parkowanie
          </Text>
        </View>
      </View>

      <View style={styles.benefitsGrid}>
        {benefits.map((b) => (
          <View key={b.id} style={styles.benefitItem}>
            <View style={styles.benefitTop}>
              <Ionicons name={b.icon as never} size={16} color={colors.river} />
              <Text style={styles.benefitDiscount}>{b.discount}</Text>
            </View>
            <Text style={styles.benefitName}>{b.title}</Text>
            <Text style={styles.benefitPlace}>{b.place}</Text>
            <Text style={styles.benefitDesc}>{b.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function OfferCard({ offer, onOpen }: { offer: CityOffer; onOpen: () => void }) {
  const { savedOffers } = useAppData();
  const kind = KIND_META[offer.kind];
  const saved = savedOffers.includes(offer.id);

  return (
    <Card onPress={onOpen} accessibilityLabel={`${offer.business}: ${offer.title}`}>
      <View style={styles.topRow}>
        <View style={styles.badges}>
          {offer.tkm ? (
            <Badge
              label={offer.benefitTag ?? 'Karta Mieszkańca'}
              color={colors.river}
              bg={colors.riverSoft}
              icon="id-card-outline"
            />
          ) : null}
          {offer.kind === 'sponsored' ? (
            <Badge label="Sponsorowane" color={kind.color} bg={kind.bg} />
          ) : (
            <Badge label={OFFER_CATEGORY_LABEL[offer.category]} color={colors.inkSoft} bg="#F3F4F6" />
          )}
          {saved ? <Badge label="Zapisano" color={colors.brick} bg={colors.brickSoft} /> : null}
        </View>
      </View>

      <Text style={styles.business}>{offer.business}</Text>
      <Text style={styles.title}>{offer.title}</Text>

      <Text style={styles.metaText} numberOfLines={1}>
        {offer.location}
        {offer.expiresAt ? ` · do ${formatLongDate(offer.expiresAt)}` : ''}
      </Text>
    </Card>
  );
}

export function OfferDetailSheet({ offer, onClose }: { offer: CityOffer | null; onClose: () => void }) {
  const { savedOffers, toggleSavedOffer } = useAppData();
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);

  if (!offer) return null;
  const kind = KIND_META[offer.kind];
  const saved = savedOffers.includes(offer.id);
  const showCode = revealed === offer.id;

  return (
    <Sheet
      visible
      onClose={() => {
        setRevealed(null);
        onClose();
      }}
      title={offer.title}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={saved ? 'Zapisano' : 'Zapisz'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            variant="secondary"
            onPress={() => {
              const now = toggleSavedOffer(offer.id);
              showToast(now ? 'Zapisano ofertę' : 'Usunięto z zapisanych', now ? 'success' : 'info');
            }}
            style={{ flex: 1 }}
          />
          {offer.code && !showCode ? (
            <Button
              label="Pokaż kod zniżkowy"
              icon="pricetag-outline"
              onPress={() => setRevealed(offer.id)}
              style={{ flex: 2 }}
            />
          ) : null}
        </View>
      }
    >
      <View style={styles.badges}>
        <Badge label={kind.label} color={kind.color} bg={kind.bg} />
        {offer.tkm ? (
          <Badge
            label={offer.benefitTag ?? 'Karta Mieszkańca'}
            color={colors.river}
            bg={colors.riverSoft}
            icon="id-card-outline"
          />
        ) : null}
      </View>

      <Text style={[styles.business, { marginTop: spacing.sm }]}>{offer.business}</Text>
      <Text style={styles.body}>{offer.description}</Text>

      {showCode && offer.code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Kod rabatowy</Text>
          <Text style={styles.code}>{offer.code}</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <MetaRow icon="location-outline" text={offer.address} />
        {offer.hours ? <MetaRow icon="time-outline" text={offer.hours} /> : null}
        <MetaRow
          icon="calendar-outline"
          text={offer.expiresAt ? `Ważne do ${formatLongDate(offer.expiresAt)}` : 'Oferta stała'}
        />
        <MetaRow icon="information-circle-outline" text={offer.conditions} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  benefitsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.riverSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsTitle: { ...font.h3, color: colors.ink },
  benefitsSub: { ...font.small, color: colors.muted, marginTop: 1 },
  benefitsGrid: { gap: spacing.sm },
  benefitItem: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  benefitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  benefitDiscount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.river,
    backgroundColor: colors.riverSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  benefitName: { ...font.bodyBold, color: colors.ink },
  benefitPlace: { ...font.small, color: colors.inkSoft, marginTop: 1 },
  benefitDesc: { ...font.small, color: colors.muted, marginTop: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  business: { ...font.small, color: colors.muted, fontWeight: '600' },
  title: { ...font.h3, color: colors.ink, marginTop: 2 },
  metaText: { ...font.small, color: colors.inkSoft, marginTop: 6 },
  body: { ...font.body, color: colors.inkSoft, marginTop: 6, marginBottom: spacing.md },
  info: {
    gap: 6,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  codeBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.brickSoft,
    marginBottom: spacing.md,
  },
  codeLabel: { ...font.small, color: colors.brickDark },
  code: { fontSize: 20, fontWeight: '700', letterSpacing: 2, color: colors.brickDark, marginTop: 2 },
});
