import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Sheet } from './ui';
import { formatLongDate } from '../lib/format';
import type { CityOffer, ResidentBenefit } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, font, radius, shadow, spacing } from '../theme';

export interface TaxpayerDeclaration {
  fullName: string;
  taxOffice: string;
  address: string;
  confirmed: boolean;
}

const BENEFIT_VISUAL: Record<string, { bg: string; fg: string }> = {
  'ben-mzk': { bg: '#DBEAFE', fg: '#1D4ED8' },
  'ben-kultura': { bg: '#FCE7F3', fg: '#BE185D' },
  'ben-sport': { bg: '#D1FAE5', fg: '#047857' },
  'ben-parking': { bg: '#EDE9FE', fg: '#6D28D9' },
};

/** Wyciąga samą wysokość zniżki (np. "−20%", "−35%", "2 w 1", "−30 min"). */
export function extractDiscountValue(raw?: string): string {
  if (!raw) return 'Zniżka';
  const trimmed = raw.trim();
  if (/^2\s*w\s*cenie\s*1$/i.test(trimmed)) return '2 w 1';
  const rangeMatch = trimmed.match(/^(−?\d+%)\s*do\s*(−?\d+%)$/i);
  if (rangeMatch) return rangeMatch[2];
  const doMatch = trimmed.match(/^do\s+(−?\d+%)$/i);
  if (doMatch) return doMatch[1];
  const minMatch = trimmed.match(/^(\d+\s*min)/i);
  if (minMatch) return `−${minMatch[1]}`;
  const percentMatch = trimmed.match(/^([−-]\d+%)/);
  if (percentMatch) return percentMatch[1];
  return trimmed;
}

/** Skraca nazwę firmy do czystej, krótkiej formy na kafelek. */
function shortCompanyName(business: string): string {
  return business
    .replace(/Naleśnikarnia\s+/i, '')
    .replace(/Browar Staromiejski\s+/i, '')
    .replace(/Manufaktura\s+/i, '')
    .replace(/Salon Optyczny\s+/i, '')
    .replace(/Księgarnia & Planszówki\s+/i, '')
    .replace(/\s*·.*$/, '')
    .replace(/\s+w Toruniu$/i, '')
    .replace(/\s+Toruń$/i, '')
    .replace(/„|”|"/g, '')
    .trim();
}

/** Krótki, spokojny jednowierszowy komunikat o zniżkach PIT kierujący do profilu. */
export function TaxpayerBanner({
  onOpenProfile,
}: {
  declaration?: TaxpayerDeclaration | null;
  onOpenForm?: () => void;
  onOpenProfile?: () => void;
}) {
  const { taxVerified } = useAppData();
  const { openAuth } = useAuth();

  const handlePress = () => {
    if (onOpenProfile) onOpenProfile();
    else openAuth('account');
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pitNote, pressed && { opacity: 0.75 }]}
    >
      <Ionicons
        name={taxVerified ? 'checkmark-circle' : 'information-circle-outline'}
        size={15}
        color={taxVerified ? colors.success : colors.muted}
      />
      <Text style={styles.pitNoteText} numberOfLines={1}>
        {taxVerified
          ? 'Zniżki PIT w Toruniu aktywne'
          : 'Zniżki z PIT w Toruniu — aktywuj w profilu'}
      </Text>
      <Ionicons name="chevron-forward" size={13} color={colors.muted} />
    </Pressable>
  );
}

/**
 * Pełnoekranowe wiersze pakietów miejskich:
 * Lwia część kafelka to duże kolorowe pole z ikoną na górze,
 * a na dole tylko wysokość zniżki, nazwa i krótki opis.
 */
export function ResidentBenefitsGrid({
  benefits,
  onSelectBenefit,
}: {
  benefits: ResidentBenefit[];
  onSelectBenefit: (b: ResidentBenefit) => void;
}) {
  return (
    <View style={styles.columnList}>
      {benefits.map((b) => {
        const discountVal = extractDiscountValue(b.discount);
        const vis = BENEFIT_VISUAL[b.id] ?? { bg: colors.riverSoft, fg: colors.river };
        return (
          <Pressable
            key={b.id}
            onPress={() => onSelectBenefit(b)}
            style={({ pressed }) => [styles.rowCard, pressed && styles.cardPressed]}
          >
            <View style={[styles.heroBanner, { backgroundColor: vis.bg }]}>
              <View style={[styles.decoCircleLarge, { backgroundColor: `${vis.fg}10` }]} />
              <View style={[styles.decoCircleSmall, { backgroundColor: `${vis.fg}14` }]} />
              <View style={[styles.heroIconWrap, { backgroundColor: `${vis.fg}18` }]}>
                <Ionicons name={b.icon as never} size={46} color={vis.fg} />
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.cardTextCol}>
                <Text style={styles.companyName} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={styles.shortDesc} numberOfLines={1}>
                  {b.place}
                </Text>
              </View>
              <Text style={[styles.discountValue, { color: vis.fg }]} numberOfLines={1}>
                {discountVal}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Pełnowymiarowy kafelek w osobnym rzędzie:
 * Na górze duże kolorowe pole z ikoną (lwia część kafelka),
 * na dole wyłącznie: nazwa firmy, krótki opis i wysokość zniżki.
 */
export function OfferGridTile({
  offer,
  onOpen,
}: {
  offer: CityOffer;
  onOpen: () => void;
}) {
  const discountVal = extractDiscountValue(offer.benefitTag);
  const company = shortCompanyName(offer.business);
  const bg = offer.logoBg ?? colors.brickSoft;
  const fg = offer.logoColor ?? colors.brick;
  const icon = (offer.logoIcon ?? 'pricetag-outline') as React.ComponentProps<typeof Ionicons>['name'];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${discountVal}, ${company}, ${offer.title}`}
      style={({ pressed }) => [styles.rowCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.heroBanner, { backgroundColor: bg }]}>
        <View style={[styles.decoCircleLarge, { backgroundColor: `${fg}10` }]} />
        <View style={[styles.decoCircleSmall, { backgroundColor: `${fg}14` }]} />
        <View style={[styles.heroIconWrap, { backgroundColor: `${fg}18` }]}>
          <Ionicons name={icon} size={48} color={fg} />
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.cardTextCol}>
          <Text style={styles.companyName} numberOfLines={1}>
            {company}
          </Text>
          <Text style={styles.shortDesc} numberOfLines={1}>
            {offer.title}
          </Text>
        </View>
        <Text style={[styles.discountValue, { color: fg }]} numberOfLines={1}>
          {discountVal}
        </Text>
      </View>
    </Pressable>
  );
}

/** Popup ze szczegółami pakietu miejskiego (lokalizacja + szczegóły). */
export function BenefitDetailSheet({
  benefit,
  onClose,
}: {
  benefit: ResidentBenefit | null;
  onClose: () => void;
  taxVerified?: boolean;
  onOpenTaxForm?: () => void;
}) {
  const { taxVerified } = useAppData();
  const { openAuth } = useAuth();

  if (!benefit) return null;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={benefit.title}
      footer={
        taxVerified ? (
          <Button label="Zamknij" variant="secondary" onPress={onClose} />
        ) : (
          <Button
            label="Aktywuj PIT w profilu"
            icon="person-outline"
            onPress={() => {
              onClose();
              setTimeout(() => openAuth('account'), 220);
            }}
          />
        )
      }
    >
      <Text style={[styles.popupDiscount, { color: colors.river }]}>{benefit.discount}</Text>

      <View style={styles.locationBox}>
        <Ionicons name="location-outline" size={18} color={colors.river} />
        <Text style={styles.locationBoxText}>{benefit.place}</Text>
      </View>

      <Text style={styles.popupBody}>{benefit.description}</Text>
    </Sheet>
  );
}

/** Popup ze szczegółami oferty (lokalizacja, godziny, opis i kod rabatowy). */
export function OfferDetailSheet({
  offer,
  onClose,
}: {
  offer: CityOffer | null;
  onClose: () => void;
  taxVerified?: boolean;
  onOpenTaxForm?: () => void;
}) {
  const { savedOffers, toggleSavedOffer, taxVerified } = useAppData();
  const { openAuth } = useAuth();
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);

  if (!offer) return null;
  const saved = savedOffers.includes(offer.id);
  const showCode = revealed === offer.id;
  const discountVal = offer.benefitTag ?? extractDiscountValue(offer.benefitTag);

  return (
    <Sheet
      visible
      onClose={() => {
        setRevealed(null);
        onClose();
      }}
      title={shortCompanyName(offer.business)}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={saved ? 'Zapisano' : 'Zapisz'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            variant="secondary"
            onPress={() => {
              const now = toggleSavedOffer(offer.id);
              showToast(now ? 'Zapisano' : 'Usunięto z zapisanych', now ? 'success' : 'info');
            }}
            style={{ flex: 1 }}
          />
          {offer.code && !showCode ? (
            offer.tkm && !taxVerified ? (
              <Button
                label="Aktywuj PIT w profilu"
                icon="person-outline"
                onPress={() => {
                  onClose();
                  setTimeout(() => openAuth('account'), 220);
                }}
                style={{ flex: 2 }}
              />
            ) : (
              <Button
                label="Pokaż kod"
                icon="pricetag-outline"
                onPress={() => setRevealed(offer.id)}
                style={{ flex: 2 }}
              />
            )
          ) : null}
        </View>
      }
    >
      <Text style={styles.popupDiscount}>{discountVal}</Text>
      <Text style={styles.popupSubtitle}>{offer.title}</Text>

      <View style={styles.locationBox}>
        <Ionicons name="location-outline" size={18} color={colors.brick} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationBoxText}>{offer.address}</Text>
          {offer.hours ? <Text style={styles.hoursText}>{offer.hours}</Text> : null}
        </View>
      </View>

      {showCode && offer.code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>KOD W LOKALU</Text>
          <Text style={styles.code}>{offer.code}</Text>
        </View>
      ) : null}

      <Text style={styles.popupBody}>{offer.description}</Text>

      <Text style={styles.conditionsNote}>
        {offer.conditions}
        {offer.expiresAt ? ` · ważne do ${formatLongDate(offer.expiresAt)}` : ''}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pitNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pitNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.inkSoft,
  },

  columnList: {
    gap: spacing.md,
  },
  rowCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  heroBanner: {
    height: 164,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decoCircleLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -40,
    top: -60,
  },
  decoCircleSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    left: -30,
    bottom: -40,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  companyName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  shortDesc: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '400',
  },
  discountValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.brick,
  },

  /* Popup ze szczegółami */
  popupDiscount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    color: colors.brick,
  },
  popupSubtitle: {
    ...font.bodyBold,
    color: colors.ink,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  locationBoxText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  hoursText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  popupBody: {
    ...font.body,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  conditionsNote: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  codeBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.brickSoft,
    marginBottom: spacing.md,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brickDark,
  },
  code: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.brickDark,
    marginTop: 2,
  },
});
