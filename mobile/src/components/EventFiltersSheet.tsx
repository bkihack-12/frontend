import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Sheet } from './ui';
import { CATEGORY_META } from '../data/events';
import {
  CostFilter,
  DEFAULT_FILTERS,
  DateFilter,
  DistanceFilter,
  EventFilters,
  TypeFilter,
} from '../lib/eventFilters';
import type { EventCategory } from '../types';
import { colors, font, spacing } from '../theme';

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'today', label: 'Dziś' },
  { value: 'tomorrow', label: 'Jutro' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'week', label: 'Ten tydzień' },
];
const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 'any', label: 'Dowolna' },
  { value: 1, label: 'do 1 km' },
  { value: 3, label: 'do 3 km' },
  { value: 5, label: 'do 5 km' },
];
const COST_OPTIONS: { value: CostFilter; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'free', label: 'Bezpłatne' },
  { value: 'paid', label: 'Płatne' },
];
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'open', label: 'Otwarte' },
  { value: 'limited', label: 'Z limitem miejsc' },
];

export const DATE_LABEL: Record<DateFilter, string> = {
  all: 'Wszystkie terminy',
  today: 'Dziś',
  tomorrow: 'Jutro',
  weekend: 'Weekend',
  week: 'Ten tydzień',
};

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

export function EventFiltersSheet({
  visible,
  onClose,
  filters,
  onChange,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  filters: EventFilters;
  onChange: (f: EventFilters) => void;
  resultCount: number;
}) {
  const toggleCategory = (c: EventCategory) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filtry wydarzeń"
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Wyczyść"
            variant="secondary"
            onPress={() => onChange(DEFAULT_FILTERS)}
            style={{ flex: 1 }}
          />
          <Button
            label={`Pokaż wyniki (${resultCount})`}
            onPress={onClose}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <Group title="Termin">
        {DATE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={filters.date === o.value}
            onPress={() => onChange({ ...filters, date: o.value })}
          />
        ))}
      </Group>
      <Group title="Kategoria">
        {(Object.keys(CATEGORY_META) as EventCategory[]).map((c) => (
          <Chip
            key={c}
            label={CATEGORY_META[c].label}
            icon={CATEGORY_META[c].icon as never}
            selected={filters.categories.includes(c)}
            onPress={() => toggleCategory(c)}
          />
        ))}
      </Group>
      <Group title="Odległość od Rynku Staromiejskiego">
        {DISTANCE_OPTIONS.map((o) => (
          <Chip
            key={String(o.value)}
            label={o.label}
            selected={filters.distance === o.value}
            onPress={() => onChange({ ...filters, distance: o.value })}
          />
        ))}
      </Group>
      <Group title="Cena">
        {COST_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={filters.cost === o.value}
            onPress={() => onChange({ ...filters, cost: o.value })}
          />
        ))}
      </Group>
      <Group title="Rodzaj wydarzenia">
        {TYPE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={filters.type === o.value}
            onPress={() => onChange({ ...filters, type: o.value })}
          />
        ))}
      </Group>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  groupTitle: { ...font.bodyBold, color: colors.ink, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

