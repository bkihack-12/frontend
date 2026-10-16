import React, { useMemo, useState } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { BoardItem, BoardScreen } from '../../components/BoardScreen';
import { ReportSheet } from '../../components/ReportSheet';
import { TRANSIT_LINES, TRANSIT_REFERENCE_ROUTES } from '../../data/notices';
import { useAppData } from '../../state/AppDataContext';
import { useToast } from '../../state/ToastContext';
import type { NoticeType } from '../../types';

const TYPES: Record<
  NoticeType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  delay: { label: 'Opóźnienia', icon: 'time-outline', color: '#C4842D' },
  interruption: { label: 'Przerwy', icon: 'alert-circle-outline', color: '#C94A4A' },
  reroute: { label: 'Objazdy', icon: 'git-branch-outline', color: '#3B6990' },
  other: { label: 'Inne', icon: 'information-circle-outline', color: '#6B7280' },
};

export default function TransportScreen() {
  const { notices, addNotice } = useAppData();
  const { showToast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);

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
        path: n.path,
        lengthLabel: n.lengthLabel,
      })),
    [notices],
  );

  const extraPolylines = useMemo(
    () =>
      TRANSIT_REFERENCE_ROUTES.map((r) => ({
        id: `ref-${r.line}`,
        path: r.path,
        color: r.color,
        label: `Linia ${r.line} (${r.lengthLabel})`,
        faint: true,
      })),
    [],
  );

  const typeKeys = Object.keys(TYPES) as NoticeType[];

  return (
    <>
      <BoardScreen
        title="Transport"
        subtitle="Linie i utrudnienia MZK"
        items={items}
        typeFilters={[
          { key: 'all', label: 'Wszystkie' },
          ...typeKeys.map((k) => ({ key: k, label: TYPES[k].label })),
        ]}
        lineFilters={TRANSIT_LINES}
        extraPolylines={extraPolylines}
        fabLabel="Zgłoś problem"
        onFab={() => setReportOpen(true)}
        emptyTitle="Brak komunikatów"
        emptyMessage="Brak utrudnień dla wybranych filtrów."
      />
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Zgłoś problem MZK"
        typeOptions={typeKeys.map((k) => ({ value: k, label: TYPES[k].label, icon: TYPES[k].icon }))}
        lineOptions={TRANSIT_LINES}
        locationLabel="Przystanek lub odcinek"
        locationPlaceholder="np. Plac Rapackiego, ul. Gagarina"
        submitLabel="Dodaj zgłoszenie"
        onSubmit={async (v) => {
          await addNotice({
            type: v.type as NoticeType,
            lines: v.lines,
            stop: v.location,
            description: v.description,
          });
          setReportOpen(false);
          showToast('Zgłoszenie dodane na mapę');
        }}
      />
    </>
  );
}
