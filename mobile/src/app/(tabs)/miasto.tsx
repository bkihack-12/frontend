import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  BenefitDetailSheet,
  OfferDetailSheet,
  OfferGridTile,
  ResidentBenefitsGrid,
  TaxpayerBanner,
} from '../../components/OfferParts';
import { LoadingState } from '../../components/ui';
import { OFFERS, RESIDENT_BENEFITS } from '../../data/offers';
import { colors, spacing } from '../../theme';
import type { ResidentBenefit } from '../../types';

export default function MiastoScreen() {
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const [openBenefit, setOpenBenefit] = useState<ResidentBenefit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const openOffer = OFFERS.find((o) => o.id === openOfferId) ?? null;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Korzyści" />

      <View style={styles.contentArea}>
        {loading ? (
          <LoadingState />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TaxpayerBanner />

            <ResidentBenefitsGrid
              benefits={RESIDENT_BENEFITS}
              onSelectBenefit={(b) => setOpenBenefit(b)}
            />

            <View style={styles.columnList}>
              {OFFERS.map((item) => (
                <OfferGridTile
                  key={item.id}
                  offer={item}
                  onOpen={() => setOpenOfferId(item.id)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <BenefitDetailSheet
        benefit={openBenefit}
        onClose={() => setOpenBenefit(null)}
      />

      <OfferDetailSheet
        offer={openOffer}
        onClose={() => setOpenOfferId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  contentArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: spacing.md,
  },
  columnList: {
    gap: spacing.md,
  },
});
