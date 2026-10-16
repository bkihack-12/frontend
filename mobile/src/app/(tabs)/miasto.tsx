import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { OfferCard, OfferDetailSheet, ResidentBenefitsSection } from '../../components/OfferParts';
import { Chip, ChipRow, EmptyState, LoadingState } from '../../components/ui';
import { OFFERS, RESIDENT_BENEFITS } from '../../data/offers';
import { useAppData } from '../../state/AppDataContext';
import { colors, font, spacing } from '../../theme';
import type { OfferKind } from '../../types';

type FilterMode = 'all' | 'benefits' | OfferKind | 'saved';

export default function MiastoScreen() {
  const { savedOffers } = useAppData();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [openId, setOpenId] = useState<string | null>(null);
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

  const open = OFFERS.find((o) => o.id === openId) ?? null;
  const showBenefitsHero = filter === 'all' || filter === 'benefits';

  return (
    <View style={styles.root}>
      <ScreenHeader title="Miasto" subtitle="Benefity mieszkańca i oferty lokalne" />
      <View style={styles.filters}>
        <ChipRow>
          <Chip label="Przegląd" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label="Benefity mieszkańca"
            icon="id-card-outline"
            selected={filter === 'benefits'}
            onPress={() => setFilter('benefits')}
          />
          <Chip label="Oferty" selected={filter === 'offer'} onPress={() => setFilter('offer')} />
          <Chip label="Informacje" selected={filter === 'info'} onPress={() => setFilter('info')} />
          <Chip label="Sponsorowane" selected={filter === 'sponsored'} onPress={() => setFilter('sponsored')} />
          <Chip label="Zapisane" selected={filter === 'saved'} onPress={() => setFilter('saved')} />
        </ChipRow>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OfferCard offer={item} onOpen={() => setOpenId(item.id)} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {showBenefitsHero ? <ResidentBenefitsSection benefits={RESIDENT_BENEFITS} /> : null}
              <Text style={styles.sectionHeading}>
                {filter === 'benefits'
                  ? 'Zniżki u partnerów z Kartą Mieszkańca'
                  : 'Oferty i informacje w Toruniu'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="Brak pozycji"
              message="W tym widoku nie ma jeszcze zapisanych ofert."
              actionLabel="Pokaż wszystko"
              onAction={() => setFilter('all')}
            />
          }
          ListFooterComponent={<View style={{ height: spacing.xl }} />}
        />
      )}

      <OfferDetailSheet offer={open} onClose={() => setOpenId(null)} />
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
  list: { padding: spacing.md },
  sectionHeading: {
    ...font.h3,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});
