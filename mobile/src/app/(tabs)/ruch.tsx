import React, { useMemo, useState } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { BoardItem, BoardScreen } from '../../components/BoardScreen';
import { ReportSheet } from '../../components/ReportSheet';
import { useAppData } from '../../state/AppDataContext';
import { useToast } from '../../state/ToastContext';
import type { IncidentType } from '../../types';

const TYPES: Record<
  IncidentType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  jam: { label: 'Korki', icon: 'car-outline', color: '#D97706' },
  roadworks: { label: 'Roboty drogowe', icon: 'construct-outline', color: '#B45309' },
  accident: { label: 'Kolizje', icon: 'warning-outline', color: '#DC2626' },
  other: { label: 'Inne', icon: 'information-circle-outline', color: '#2563EB' },
};

export default function RuchScreen() {
  const { incidents, addIncident } = useAppData();
  const { showToast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  const items = useMemo<BoardItem[]>(
    () =>
      incidents.map((i) => ({
        id: i.id,
        typeKey: i.type,
        typeLabel: TYPES[i.type].label,
        icon: TYPES[i.type].icon,
        color: TYPES[i.type].color,
        title: i.title,
        where: i.location,
        reportedAt: i.reportedAt,
        severity: i.severity,
        impact: i.impact,
        status: i.status,
        description: i.description,
        source: i.source,
        author: i.author,
        lat: i.lat,
        lng: i.lng,
        path: i.path,
        lengthLabel: i.lengthLabel,
      })),
    [incidents],
  );

  return (
    <>
      <BoardScreen
        title="Ruch drogowy"
        subtitle="Korki i utrudnienia w Toruniu"
        items={items}
        typeFilters={[
          { key: 'all', label: 'Wszystkie' },
          ...(Object.keys(TYPES) as IncidentType[]).map((k) => ({
            key: k,
            label: TYPES[k].label,
            icon: TYPES[k].icon,
          })),
        ]}
        mapMode="traffic"
        fabLabel="Zgłoś utrudnienie"
        onFab={() => setReportOpen(true)}
        emptyTitle="Brak utrudnień"
        emptyMessage="W tej kategorii nie ma obecnie zgłoszeń."
      />
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Zgłoś utrudnienie"
        typeOptions={(Object.keys(TYPES) as IncidentType[]).map((k) => ({
          value: k,
          label: TYPES[k].label,
          icon: TYPES[k].icon,
        }))}
        locationLabel="Ulica lub odcinek"
        locationPlaceholder="np. Most Piłsudskiego, Szosa Chełmińska"
        submitLabel="Dodaj zgłoszenie"
        onSubmit={async (v) => {
          await addIncident({
            type: v.type as IncidentType,
            location: v.location,
            description: v.description,
          });
          setReportOpen(false);
          showToast('Zgłoszenie dodane na mapę');
        }}
      />
    </>
  );
}
