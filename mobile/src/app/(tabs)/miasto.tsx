import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  BenefitDetailSheet,
  OfferDetailSheet,
  OfferGridTile,
  ResidentBenefitsGrid,
  TaxpayerBanner,
  TaxpayerDeclaration,
  TaxpayerFormSheet,
} from '../../components/OfferParts';
import { Button, Chip, CornerFilterButton, EmptyState, LoadingState, Sheet } from '../../components/ui';
import { OFFERS, RESIDENT_BENEFITS } from '../../data/offers';
import { useAppData } from '../../state/AppDataContext';
import { useToast } from '../../state/ToastContext';
import { colors, font, spacing } from '../../theme';
import type { OfferKind, ResidentBenefit } from '../../types';

type FilterMode = 'all' | 'benefits' | OfferKind | 'saved';

const FILTER_OPTIONS: {
  key: FilterMode;
  label: string;
  icon?: React.ComponentProps<typeof Chip>['icon'];
}[] = [
  { key: 'all', label: 'Przegląd (wszystko)', icon: 'apps-outline' },
  { key: 'benefits', label: 'Zniżki z Kartą (PIT w Toruniu)', icon: 'id-card-outline' },
  { key: 'offer', label: 'Oferty lokalne', icon: 'pricetag-outline' },
  { key: 'info', label: 'Informacje miejskie', icon: 'information-circle-outline' },
  { key: 'sponsored', label: 'Sponsorowane', icon: 'megaphone-outline' },
  { key: 'saved', label: 'Zapisane przeze mnie', icon: 'bookmark-outline' },
];

export default function MiastoScreen() {
  const { savedOffers } = useAppData();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const [openBenefit, setOpenBenefit] = useState<ResidentBenefit | null>(null);
  const [taxFormOpen, setTaxFormOpen] = useState(false);
  const [taxDecl, setTaxDecl] = useState<TaxpayerDeclaration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(
    () =>
      OFFERS.filter((o) => {
        if (filter === 'all') return true;
        if (filter === 'benefits') return o.tkm;
        if (filter === 'saved') return savedOffers.includes(o.id);
        return o.kind === filter;
      }),
    [filter, savedOffers],
  );

  const openOffer = OFFERS.find((o) => o.id === openOfferId) ?? null;
  const showBenefitsHero = filter === 'all' || filter === 'benefits';
  const activeCount = filter !== 'all' ? 1 : undefined;
  const taxVerified = Boolean(taxDecl?.confirmed);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Miasto" subtitle="Zniżki dla podatników w Toruniu i oferty lokalne" />

      <View style={styles.contentArea}>
        <CornerFilterButton
          count={activeCount}
          onPress={() => setFiltersOpen(true)}
          style={styles.cornerBtn}
        />

        {loading ? (
          <LoadingState />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TaxpayerBanner
              declaration={taxDecl}
              onOpenForm={() => setTaxFormOpen(true)}
            />

            {showBenefitsHero ? (
              <ResidentBenefitsGrid
                benefits={RESIDENT_BENEFITS}
                onSelectBenefit={(b) => setOpenBenefit(b)}
              />
            ) : null}

            <Text style={styles.sectionHeading}>
              {filter === 'benefits'
                ? 'Zniżki u partnerów (wymagany PIT w Toruniu)'
                : 'Zniżki i oferty partnerskie'}
            </Text>

            {filtered.length === 0 ? (
              <EmptyState
                icon="bookmark-outline"
                title="Brak pozycji"
                message="W tym widoku nie ma jeszcze zapisanych ofert."
                actionLabel="Pokaż wszystko"
                onAction={() => setFilter('all')}
              />
            ) : (
              <View style={styles.grid}>
                {filtered.map((item) => (
                  <OfferGridTile
                    key={item.id}
                    offer={item}
                    onOpen={() => setOpenOfferId(item.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <Sheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtry — Miasto"
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Wyczyść"
              variant="secondary"
              onPress={() => setFilter('all')}
              style={{ flex: 1 }}
            />
            <Button
              label={`Pokaż (${filtered.length})`}
              onPress={() => setFiltersOpen(false)}
              style={{ flex: 2 }}
            />
          </View>
        }
      >
        <Text style={styles.groupTitle}>Widok i kategoria</Text>
        <View style={styles.wrap}>
          {FILTER_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              icon={opt.icon}
              selected={filter === opt.key}
              onPress={() => setFilter(opt.key)}
            />
          ))}
        </View>
      </Sheet>

      <BenefitDetailSheet
        benefit={openBenefit}
        onClose={() => setOpenBenefit(null)}
        taxVerified={taxVerified}
        onOpenTaxForm={() => setTaxFormOpen(true)}
      />

      <OfferDetailSheet
        offer={openOffer}
        onClose={() => setOpenOfferId(null)}
        taxVerified={taxVerified}
        onOpenTaxForm={() => setTaxFormOpen(true)}
      />

      <TaxpayerFormSheet
        visible={taxFormOpen}
        onClose={() => setTaxFormOpen(false)}
        initial={taxDecl}
        onSave={(decl) => {
          setTaxDecl(decl);
          showToast('Potwierdzono rozliczanie podatków w Toruniu', 'success');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  contentArea: { flex: 1 },
  cornerBtn: {
    left: undefined,
    right: spacing.md,
    top: spacing.sm,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xl + spacing.sm,
    paddingBottom: spacing.xl,
  },
  sectionHeading: {
    ...font.h3,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupTitle: { ...font.bodyBold, color: colors.ink, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
