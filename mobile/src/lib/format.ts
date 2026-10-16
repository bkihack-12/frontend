const MONTHS_GEN = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];
const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const WEEKDAYS_SHORT = ['nd.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Dziś", "Jutro" or "sob., 17 października". */
export function formatDayLabel(iso: string | Date, now: Date = new Date()): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isSameDay(d, now)) return 'Dziś';
  if (isSameDay(d, addDays(now, 1))) return 'Jutro';
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** "Dziś, 18:00" */
export function formatDateTime(iso: string | Date, now: Date = new Date()): string {
  return `${formatDayLabel(iso, now)}, ${formatTime(iso)}`;
}

/** "17 października 2026" */
export function formatLongDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatWeekday(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return WEEKDAYS[d.getDay()];
}

/** "5 min temu", "2 godz. temu", "wczoraj". */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const diffMin = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'przed chwilą';
  if (diffMin < 60) return `${diffMin} min temu`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} godz. temu`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'wczoraj' : `${days} dni temu`;
}

/** Polish plural: pluralPl(1,'osoba','osoby','osób'). */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 10) * 100} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatPrice(zl: number): string {
  return `${zl.toFixed(0)} zł`;
}

