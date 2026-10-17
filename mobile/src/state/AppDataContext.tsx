import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS } from '../data/events';
import { TRAFFIC_INCIDENTS, TRANSIT_NOTICES } from '../data/notices';
import { KEYS, loadJson, saveJson } from '../lib/storage';
import type {
  Booking,
  CityEvent,
  IncidentType,
  NoticeType,
  SessionUser,
  TrafficIncident,
  TransitNotice,
} from '../types';
import { useAuth } from './AuthContext';

interface PersistedData {
  interested: string[];
  bookings: Record<string, Booking[]>;
  savedOffers: string[];
  userIncidents: TrafficIncident[];
  userNotices: TransitNotice[];
}

const EMPTY: PersistedData = {
  interested: [],
  bookings: {},
  savedOffers: [],
  userIncidents: [],
  userNotices: [],
};

type BookResult = { ok: true; booking: Booking } | { ok: false; error: string };

interface AppDataValue {
  ready: boolean;
  events: CityEvent[];
  isInterested: (eventId: string) => boolean;
  toggleInterested: (eventId: string) => boolean;
  interestedCount: (event: CityEvent) => number;
  placesLeft: (event: CityEvent) => number | undefined;
  getBooking: (eventId: string) => Booking | undefined;
  bookEvent: (eventId: string, user: SessionUser) => Promise<BookResult>;
  cancelBooking: (eventId: string, user: SessionUser) => Promise<void>;
  myBookings: Booking[];
  savedOffers: string[];
  toggleSavedOffer: (offerId: string) => boolean;
  incidents: TrafficIncident[];
  notices: TransitNotice[];
  addIncident: (input: {
    type: IncidentType;
    location: string;
    description: string;
    lengthLabel?: string;
  }) => Promise<TrafficIncident>;
  addNotice: (input: {
    type: NoticeType;
    lines: string[];
    stop: string;
    description: string;
  }) => Promise<TransitNotice>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

const makeCode = () =>
  `TOR-${Math.random().toString(36).slice(2, 7).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dopasowuje przybliżone współrzędne zgłoszenia na podstawie wpisanej nazwy. */
function inferTorunRoadGeometry(locationText: string) {
  const q = locationText.toLowerCase();
  if (q.includes('most') || q.includes('piłsud') || q.includes('rapack')) {
    return {
      lat: 53.0055,
      lng: 18.6003,
      path: [
        { lat: 53.001, lng: 18.5972 },
        { lat: 53.0087, lng: 18.6029 },
      ],
    };
  }
  if (q.includes('chełm') || q.includes('bema')) {
    return {
      lat: 53.0195,
      lng: 18.5985,
      path: [
        { lat: 53.0155, lng: 18.6002 },
        { lat: 53.0235, lng: 18.5968 },
      ],
    };
  }
  if (q.includes('bydgos') || q.includes('gagarin') || q.includes('umk')) {
    return {
      lat: 53.0152,
      lng: 18.5815,
      path: [
        { lat: 53.0135, lng: 18.591 },
        { lat: 53.0168, lng: 18.572 },
      ],
    };
  }
  if (q.includes('lubic') || q.includes('skarp') || q.includes('rubink')) {
    return {
      lat: 53.0205,
      lng: 18.654,
      path: [
        { lat: 53.0185, lng: 18.641 },
        { lat: 53.0222, lng: 18.667 },
      ],
    };
  }
  if (q.includes('grudziądz') || q.includes('kościusz')) {
    return {
      lat: 53.0235,
      lng: 18.6152,
      path: [
        { lat: 53.0185, lng: 18.6115 },
        { lat: 53.0285, lng: 18.6175 },
      ],
    };
  }
  return {
    lat: 53.0112,
    lng: 18.6052,
    path: [
      { lat: 53.0098, lng: 18.6012 },
      { lat: 53.0126, lng: 18.6092 },
    ],
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<PersistedData>(EMPTY);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const stored = await loadJson<PersistedData>(KEYS.data, EMPTY);
      setData({ ...EMPTY, ...stored });
      setReady(true);
    })();
  }, []);

  const update = useCallback((fn: (prev: PersistedData) => PersistedData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
    saveJson(KEYS.data, next);
  }, []);

  const allBookingsFor = useCallback(
    (eventId: string) =>
      Object.values(dataRef.current.bookings).reduce(
        (n, list) => n + list.filter((b) => b.eventId === eventId).length,
        0,
      ),
    [],
  );

  const placesLeft = useCallback(
    (event: CityEvent) => {
      if (event.type !== 'limited' || event.capacity === undefined) return undefined;
      const bookedLocally = Object.values(data.bookings).reduce(
        (n, list) => n + list.filter((b) => b.eventId === event.id).length,
        0,
      );
      return Math.max(0, event.capacity - (event.taken ?? 0) - bookedLocally);
    },
    [data.bookings],
  );

  const isInterested = useCallback((id: string) => data.interested.includes(id), [data.interested]);

  const toggleInterested = useCallback(
    (id: string) => {
      const was = dataRef.current.interested.includes(id);
      update((p) => ({
        ...p,
        interested: was ? p.interested.filter((x) => x !== id) : [...p.interested, id],
      }));
      return !was;
    },
    [update],
  );

  const interestedCount = useCallback(
    (event: CityEvent) => event.interested + (data.interested.includes(event.id) ? 1 : 0),
    [data.interested],
  );

  const getBooking = useCallback(
    (eventId: string) => (user ? data.bookings[user.id]?.find((b) => b.eventId === eventId) : undefined),
    [data.bookings, user],
  );

  const bookEvent = useCallback<AppDataValue['bookEvent']>(
    async (eventId, u) => {
      await wait(450);
      const event = EVENTS.find((e) => e.id === eventId);
      if (!event || event.type !== 'limited' || event.capacity === undefined) {
        return { ok: false, error: 'To wydarzenie nie wymaga zapisów.' };
      }
      const existing = dataRef.current.bookings[u.id]?.find((b) => b.eventId === eventId);
      if (existing) return { ok: false, error: 'Masz już rezerwację na to wydarzenie.' };
      const left = event.capacity - (event.taken ?? 0) - allBookingsFor(eventId);
      if (left <= 0) return { ok: false, error: 'Brak wolnych miejsc.' };
      const booking: Booking = { eventId, code: makeCode(), bookedAt: new Date().toISOString() };
      update((p) => ({
        ...p,
        bookings: { ...p.bookings, [u.id]: [...(p.bookings[u.id] ?? []), booking] },
      }));
      return { ok: true, booking };
    },
    [allBookingsFor, update],
  );

  const cancelBooking = useCallback<AppDataValue['cancelBooking']>(
    async (eventId, u) => {
      await wait(300);
      update((p) => ({
        ...p,
        bookings: {
          ...p.bookings,
          [u.id]: (p.bookings[u.id] ?? []).filter((b) => b.eventId !== eventId),
        },
      }));
    },
    [update],
  );

  const myBookings = useMemo(() => (user ? data.bookings[user.id] ?? [] : []), [data.bookings, user]);

  const toggleSavedOffer = useCallback(
    (id: string) => {
      const was = dataRef.current.savedOffers.includes(id);
      update((p) => ({
        ...p,
        savedOffers: was ? p.savedOffers.filter((x) => x !== id) : [...p.savedOffers, id],
      }));
      return !was;
    },
    [update],
  );

  const addIncident = useCallback<AppDataValue['addIncident']>(
    async ({ type, location, description, lengthLabel }) => {
      await wait(450);
      const geo = inferTorunRoadGeometry(location);
      const item: TrafficIncident = {
        id: `tr-user-${Date.now()}`,
        type,
        title: titleFor(type),
        location: location.trim(),
        reportedAt: new Date().toISOString(),
        severity: 'medium',
        impact: 'Zgłoszenie mieszkańca',
        status: 'Nowe zgłoszenie',
        description: description.trim(),
        source: 'user',
        author: user?.name ?? 'Gość',
        lat: geo.lat,
        lng: geo.lng,
        // Nie rysujemy heurystycznej geometrii jako trasy. Odcinek musi zostać zweryfikowany.
        path: [],
        lengthLabel: lengthLabel?.trim() || '500 m',
      };
      update((p) => ({ ...p, userIncidents: [item, ...p.userIncidents] }));
      return item;
    },
    [update, user],
  );

  const addNotice = useCallback<AppDataValue['addNotice']>(
    async ({ type, lines, stop, description }) => {
      await wait(450);
      const geo = inferTorunRoadGeometry(stop);
      const item: TransitNotice = {
        id: `tn-user-${Date.now()}`,
        type,
        lines,
        stop: stop.trim(),
        location: stop.trim(),
        reportedAt: new Date().toISOString(),
        severity: 'medium',
        impact: 'Zgłoszenie pasażera',
        status: 'Nowe zgłoszenie',
        description: description.trim(),
        source: 'user',
        author: user?.name ?? 'Gość',
        lat: geo.lat,
        lng: geo.lng,
        path: [],
        lengthLabel: '1,2 km trasy',
      };
      update((p) => ({ ...p, userNotices: [item, ...p.userNotices] }));
      return item;
    },
    [update, user],
  );

  const incidents = useMemo(
    () =>
      [...data.userIncidents, ...TRAFFIC_INCIDENTS].map((i) =>
        i.source === 'user'
          ? { ...i, path: [] }
          : i.path && i.lat
            ? i
            : { ...i, ...inferTorunRoadGeometry(i.location), lengthLabel: i.lengthLabel ?? '600 m' },
      ),
    [data.userIncidents],
  );

  const notices = useMemo(
    () =>
      [...data.userNotices, ...TRANSIT_NOTICES].map((n) =>
        n.source === 'user'
          ? { ...n, path: [] }
          : n.path && n.lat
            ? n
            : { ...n, ...inferTorunRoadGeometry(n.stop), lengthLabel: n.lengthLabel ?? '1,2 km trasy' },
      ),
    [data.userNotices],
  );

  const value: AppDataValue = {
    ready,
    events: EVENTS,
    isInterested,
    toggleInterested,
    interestedCount,
    placesLeft,
    getBooking,
    bookEvent,
    cancelBooking,
    myBookings,
    savedOffers: data.savedOffers,
    toggleSavedOffer,
    incidents,
    notices,
    addIncident,
    addNotice,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

function titleFor(type: IncidentType): string {
  switch (type) {
    case 'roadworks':
      return 'Roboty drogowe';
    case 'jam':
      return 'Zator drogowy';
    case 'accident':
      return 'Kolizja / wypadek';
    default:
      return 'Utrudnienie w ruchu';
  }
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
