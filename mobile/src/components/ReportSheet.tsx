import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, InlineNotice, Sheet, TextField } from './ui';
import type { TransitStop } from '../types';
import { colors, font, radius, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Chip>['icon'];

export interface ReportTypeOption {
  value: string;
  label: string;
  icon: IconName;
}

export interface ReportValues {
  type: string;
  location: string;
  stopId?: string;
  description: string;
  lines: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  typeOptions: ReportTypeOption[];
  locationLabel?: string;
  locationPlaceholder?: string;
  lineOptions?: string[];
  /** Lista przystanków — gdy podana, zgłoszenie jest ograniczone wyłącznie do wybranego przystanku. */
  stopOptions?: TransitStop[];
  initialStopId?: string | null;
  submitLabel: string;
  onSubmit: (values: ReportValues) => Promise<void>;
}

export function ReportSheet({
  visible,
  onClose,
  title,
  intro,
  typeOptions,
  locationLabel = 'Lokalizacja',
  locationPlaceholder = '',
  lineOptions,
  stopOptions,
  initialStopId,
  submitLabel,
  onSubmit,
}: Props) {
  const [type, setType] = useState(typeOptions[0].value);
  const [location, setLocation] = useState('');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedStop = useMemo(
    () => stopOptions?.find((s) => s.id === selectedStopId) ?? null,
    [stopOptions, selectedStopId],
  );

  // Linie dostępne dla wybranego przystanku (lub wszystkie, jeśli brak przystanków)
  const availableLines = useMemo(() => {
    if (stopOptions) {
      return selectedStop ? selectedStop.lines : [];
    }
    return lineOptions ?? [];
  }, [stopOptions, selectedStop, lineOptions]);

  useEffect(() => {
    if (visible) {
      setType(typeOptions[0].value);
      setDescription('');
      setErrors({});
      setFormError('');
      setBusy(false);

      if (stopOptions && stopOptions.length > 0) {
        const initStop =
          stopOptions.find((s) => s.id === initialStopId) ?? stopOptions[0];
        setSelectedStopId(initStop.id);
        setLocation(initStop.name);
        setLines(initStop.lines.slice(0, 1));
      } else {
        setSelectedStopId('');
        setLocation('');
        setLines([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialStopId]);

  const handleSelectStop = (stop: TransitStop) => {
    setSelectedStopId(stop.id);
    setLocation(stop.name);
    setLines((prev) => {
      const valid = prev.filter((l) => stop.lines.includes(l));
      return valid.length > 0 ? valid : stop.lines.slice(0, 1);
    });
    setErrors((prev) => ({ ...prev, location: '', lines: '' }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (stopOptions) {
      if (!selectedStop) e.location = 'Wybierz przystanek z listy.';
      if (lines.length === 0) e.lines = 'Wybierz linię zatrzymującą się na tym przystanku.';
    } else {
      if (location.trim().length < 3) e.location = 'Podaj lokalizację (min. 3 znaki).';
      if (lineOptions && lines.length === 0) e.lines = 'Wybierz przynajmniej jedną linię.';
    }
    if (description.trim().length < 6) e.description = 'Dodaj krótki opis (min. 6 znaków).';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await onSubmit({
        type,
        location: selectedStop ? selectedStop.name : location.trim(),
        stopId: selectedStop?.id,
        description,
        lines,
      });
    } catch {
      setFormError('Nie udało się dodać zgłoszenia.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {intro ? <InlineNotice kind="info" text={intro} /> : null}
      <Text style={styles.label}>Rodzaj utrudnienia</Text>
      <View style={styles.wrap}>
        {typeOptions.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            icon={o.icon}
            selected={type === o.value}
            onPress={() => setType(o.value)}
          />
        ))}
      </View>

      {stopOptions ? (
        <>
          <Text style={styles.label}>Wybierz przystanek</Text>
          <View style={styles.stopList}>
            {stopOptions.map((s) => {
              const active = s.id === selectedStopId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => handleSelectStop(s)}
                  style={({ pressed }) => [
                    styles.stopItem,
                    active && styles.stopItemActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={active ? colors.brick : colors.muted}
                  />
                  <Text
                    style={[styles.stopName, active && { color: colors.brickDark, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                  <Text style={styles.stopLines}>L: {s.lines.join(', ')}</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}

          {selectedStop ? (
            <>
              <Text style={styles.label}>Linia na przystanku „{selectedStop.name}”</Text>
              <View style={styles.wrap}>
                {availableLines.map((l) => (
                  <Chip
                    key={l}
                    label={`Linia ${l}`}
                    icon="bus-outline"
                    selected={lines.includes(l)}
                    onPress={() =>
                      setLines((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))
                    }
                  />
                ))}
              </View>
              {errors.lines ? <Text style={styles.error}>{errors.lines}</Text> : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          {lineOptions ? (
            <>
              <Text style={styles.label}>Linia</Text>
              <View style={styles.wrap}>
                {lineOptions.map((l) => (
                  <Chip
                    key={l}
                    label={l}
                    selected={lines.includes(l)}
                    onPress={() =>
                      setLines((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))
                    }
                  />
                ))}
              </View>
              {errors.lines ? <Text style={styles.error}>{errors.lines}</Text> : null}
            </>
          ) : null}

          <View style={{ height: spacing.md }} />
          <TextField
            label={locationLabel}
            icon="location-outline"
            value={location}
            onChangeText={setLocation}
            placeholder={locationPlaceholder}
            error={errors.location}
          />
        </>
      )}

      <View style={{ height: spacing.sm }} />
      <TextField
        label="Krótki opis"
        value={description}
        onChangeText={setDescription}
        placeholder="Co dzieje się na miejscu?"
        multiline
        maxLength={250}
        error={errors.description}
      />
      {formError ? <InlineNotice kind="error" text={formError} /> : null}
      <Button label={submitLabel} onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: {
    ...font.small,
    fontWeight: '600',
    color: colors.inkSoft,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stopList: {
    gap: 5,
    maxHeight: 210,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'scroll' as never,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stopItemActive: {
    backgroundColor: colors.brickSoft,
    borderColor: '#E5BFB8',
  },
  stopName: { ...font.small, color: colors.ink, flex: 1 },
  stopLines: { ...font.tiny, color: colors.muted },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
});
