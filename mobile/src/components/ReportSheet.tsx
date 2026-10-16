import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chip, InlineNotice, Sheet, TextField } from './ui';
import { colors, font, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Chip>['icon'];

export interface ReportTypeOption {
  value: string;
  label: string;
  icon: IconName;
}

export interface ReportValues {
  type: string;
  location: string;
  description: string;
  lines: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  typeOptions: ReportTypeOption[];
  locationLabel: string;
  locationPlaceholder: string;
  lineOptions?: string[];
  submitLabel: string;
  onSubmit: (values: ReportValues) => Promise<void>;
}

export function ReportSheet({
  visible,
  onClose,
  title,
  intro,
  typeOptions,
  locationLabel,
  locationPlaceholder,
  lineOptions,
  submitLabel,
  onSubmit,
}: Props) {
  const [type, setType] = useState(typeOptions[0].value);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(typeOptions[0].value);
      setLocation('');
      setDescription('');
      setLines([]);
      setErrors({});
      setFormError('');
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (location.trim().length < 3) e.location = 'Podaj lokalizację (min. 3 znaki).';
    if (description.trim().length < 6) e.description = 'Dodaj krótki opis (min. 6 znaków).';
    if (lineOptions && lines.length === 0) e.lines = 'Wybierz przynajmniej jedną linię.';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await onSubmit({ type, location, description, lines });
    } catch {
      setFormError('Nie udało się dodać zgłoszenia.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {intro ? <InlineNotice kind="info" text={intro} /> : null}
      <Text style={styles.label}>Kategoria</Text>
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
      <TextField
        label="Krótki opis"
        value={description}
        onChangeText={setDescription}
        placeholder="Co warto wiedzieć?"
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
  label: { ...font.small, fontWeight: '600', color: colors.inkSoft, marginTop: spacing.sm, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
});
