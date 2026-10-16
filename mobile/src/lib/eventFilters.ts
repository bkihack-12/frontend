import type { CityEvent, EventCategory } from '../types';
import { addDays, isSameDay, startOfDay } from './format';
import { DEMO_USER_LOCATION, distanceKm } from './geo';

export type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week';
export type DistanceFilter = 'any' | 1 | 3 | 5;
export type CostFilter = 'all' | 'free' | 'paid';
export type TypeFilter = 'all' | 'open' | 'limited';

export interface EventFilters {
  date: DateFilter;
  categories: EventCategory[];
  distance: DistanceFilter;
  cost: CostFilter;
  type: TypeFilter;
}

export const DEFAULT_FILTERS: EventFilters = {
  date: 'all',
  categories: [],
  distance: 'any',
  cost: 'all',
  type: 'all',
};

export interface EventWithDistance extends CityEvent {
  distanceKm: number;
}

export function withDistance(events: CityEvent[]): EventWithDistance[] {
  return events.map((e) => ({ ...e, distanceKm: distanceKm(DEMO_USER_LOCATION, e) }));
}

export function activeFilterCount(f: EventFilters): number {
  return (
    (f.date !== 'all' ? 1 : 0) +
    (f.categories.length ? 1 : 0) +
    (f.distance !== 'any' ? 1 : 0) +
    (f.cost !== 'all' ? 1 : 0) +
    (f.type !== 'all' ? 1 : 0)
  );
}

export function filterEvents(
  events: EventWithDistance[],
  f: EventFilters,
  now: Date = new Date(),
): EventWithDistance[] {
  const today = startOfDay(now);
  return events
    .filter((e) => {
      const start = new Date(e.startsAt);
      if (new Date(e.endsAt) < now) return false; // already over

      switch (f.date) {
        case 'today':
          if (!isSameDay(start, now)) return false;
          break;
        case 'tomorrow':
          if (!isSameDay(start, addDays(now, 1))) return false;
          break;
        case 'weekend': {
          const dow = start.getDay();
          const within = start < addDays(today, 8);
          if (!(dow === 0 || dow === 6) || !within) return false;
          break;
        }
        case 'week':
          if (start >= addDays(today, 7)) return false;
          break;
      }

      if (f.categories.length && !f.categories.includes(e.category)) return false;
      if (f.distance !== 'any' && e.distanceKm > f.distance) return false;
      if (f.cost === 'free' && !e.isFree) return false;
      if (f.cost === 'paid' && e.isFree) return false;
      if (f.type !== 'all' && e.type !== f.type) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

