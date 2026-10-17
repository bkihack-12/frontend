import React, { useMemo, useState } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { BoardItem, BoardScreen } from '../../components/BoardScreen';
import { ReportSheet } from '../../components/ReportSheet';
import { TRANSIT_LINES, TRANSIT_REFERENCE_ROUTES, TRANSIT_STOPS } from '../../data/notices';
import { useAppData } from '../../state/AppDataContext';
import { useToast } from '../../state/ToastContext';
import type { NoticeType } from '../../types';

const TYPES: Record<
  NoticeType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  delay: { label: 'Opóźnienia', icon: 'time-outline', color: '#D97706' },
  interruption: { label: 'Przerwy', icon: 'alert-circle-outline', color: '#DC2626' },
  reroute: { label: 'Objazdy', icon: 'git-branch-outline', color: '#2563EB' },
  other: { label: 'Inne', icon: 'information-circle-outline', color: '#4B5563' },
};

const TRANSIT_LINE_COLORS: Record<string, string> = {
  '1': '#3B6990',
  '2': '#2563EB',
  '4': '#0F766E',
  '11': '#7C3AED',
  '14': '#0284C7',
  '22': '#0891B2',
  '25': '#4F46E5',
  '27': '#0D9488',
};

export default function TransportScreen() {
  const { notices, addNotice } = useAppData();
  const { showToast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStopId, setReportStopId] = useState<string | null>(null);

  const items = useMemo<BoardItem[]>(
    () =>
      notices.map((n) => ({
        id: n.id,
        typeKey: n.type,
        typeLabel: TYPES[n.type].label,
        icon: TYPES[n.type].icon,
        color: TYPES[n.type].color,
        title: n.stop,
        where: n.location,
        stopId: n.stopId,
        lines: n.lines,
        reportedAt: n.reportedAt,
        severity: n.severity,
        impact: n.impact,
        status: n.status,
        description: n.description,
        source: n.source,
        author: n.author,
        lat: n.lat,
        lng: n.lng,
        // Zweryfikowane komunikaty (sample) zaznaczają odcinek na linii komunikacji;
        // zgłoszenia pasażerów dotyczą konkretnego przystanku.
        path: n.source === 'sample' ? n.path : [],
        lengthLabel: n.lengthLabel,
      })),
    [notices],
  );

  const extraPolylines = useMemo(
    () =>
      TRANSIT_REFERENCE_ROUTES.map((r) => ({
        id: `ref-${r.line}`,
        path: r.path,
        color: TRANSIT_LINE_COLORS[r.line] ?? r.color,
        label: `Linia ${r.line} (${r.lengthLabel})`,
        // Pełny przebieg linii jako czytelna trasa bazowa pod zweryfikowanymi odcinkami utrudnień
        faint: true,
      })),
    [],
  );

  const typeKeys = Object.keys(TYPES) as NoticeType[];

  return (
    <>
      <BoardScreen
        title="Transport"
        subtitle="Przystanki, linie i utrudnienia MZK"
        items={items}
        typeFilters={[
          { key: 'all', label: 'Wszystkie' },
          ...typeKeys.map((k) => ({ key: k, label: TYPES[k].label, icon: TYPES[k].icon })),
        ]}
        lineFilters={TRANSIT_LINES}
        stops={TRANSIT_STOPS}
        extraPolylines={extraPolylines}
        showItemPaths
        mapMode="transit"
        fabLabel="Zgłoś na przystanku"
        onFab={(stopId) => {
          setReportStopId(stopId ?? null);
          setReportOpen(true);
        }}
        emptyTitle="Brak komunikatów"
        emptyMessage="Brak utrudnień dla wybranych filtrów."
      />
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Zgłoś utrudnienie na przystanku"
        intro="Wybierz przystanek MZK, którego dotyczy utrudnienie."
        typeOptions={typeKeys.map((k) => ({ value: k, label: TYPES[k].label, icon: TYPES[k].icon }))}
        stopOptions={TRANSIT_STOPS}
        initialStopId={reportStopId}
        submitLabel="Dodaj zgłoszenie"
        onSubmit={async (v) => {
          await addNotice({
            type: v.type as NoticeType,
            lines: v.lines,
            stopId: v.stopId,
            stop: v.location,
            description: v.description,
          });
          setReportOpen(false);
          showToast('Zgłoszenie dodane dla przystanku');
        }}
      />
    </>
  );
}
