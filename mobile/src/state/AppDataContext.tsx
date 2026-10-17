import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS } from '../data/events';
import { TRAFFIC_INCIDENTS, TRANSIT_NOTICES, TRANSIT_STOPS } from '../data/notices';
import { INITIAL_CIVIC_MESSAGES, INITIAL_NOTIFICATIONS } from '../data/offers';
import { KEYS, loadJson, saveJson } from '../lib/storage';
import type {
  Booking,
  CityEvent,
  CivicCategory,
  CivicMessage,
  EventCategory,
  IncidentType,
  NoticeType,
  NotificationPrefs,
  SessionUser,
  TrafficIncident,
  TransitNotice,
  UserNotification,
} from '../types';
import { useAuth } from './AuthContext';

interface PersistedData {
  interested: string[];
  bookings: Record<string, Booking[]>;
  savedOffers: string[];
  userEvents: CityEvent[];
  deletedEventIds: string[];
  userIncidents: TrafficIncident[];
  userNotices: TransitNotice[];
  userCivicMessages: CivicMessage[];
  upvotedCivicIds: string[];
  notifications: UserNotification[];
  notificationPrefs: NotificationPrefs;
  taxVerified: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  transitAlerts: true,
  eventReminders: true,
  authorityReplies: true,
  partnerDiscounts: true,
};

const EMPTY: PersistedData = {
  interested: [],
  bookings: {},
  savedOffers: [],
  userEvents: [],
  deletedEventIds: [],
  userIncidents: [],
  userNotices: [],
  userCivicMessages: [],
  upvotedCivicIds: [],
  notifications: INITIAL_NOTIFICATIONS,
  notificationPrefs: DEFAULT_PREFS,
  taxVerified: false,
};

type BookResult = { ok: true; booking: Booking } | { ok: false; error: string };

interface AppDataValue {
  ready: boolean;
  events: CityEvent[];
  addEvent: (input: {
    title: string;
    category: EventCategory;
    venue: string;
    address: string;
    lat: number;
    lng: number;
    isFree: boolean;
    priceZl?: number;
    description: string;
  }) => Promise<CityEvent>;
  deleteEvent: (eventId: string) => void;
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
    stopId?: string;
    stop: string;
    description: string;
  }) => Promise<TransitNotice>;
  civicMessages: CivicMessage[];
  hasUpvotedCivic: (id: string) => boolean;
  toggleCivicUpvote: (id: string) => boolean;
  addCivicMessage: (input: {
    category: CivicCategory;
    department: string;
    title: string;
    district: string;
    description: string;
  }) => Promise<CivicMessage>;
  notifications: UserNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPrefs: NotificationPrefs;
  toggleNotificationPref: (key: keyof NotificationPrefs) => void;
  taxVerified: boolean;
  setTaxVerified: (verified: boolean) => void;
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
      const stored = await loadJson<Partial<PersistedData>>(KEYS.data, EMPTY);
      setData({
        ...EMPTY,
        ...stored,
        notifications:
          Array.isArray(stored.notifications) && stored.notifications.length > 0
            ? stored.notifications
            : INITIAL_NOTIFICATIONS,
        notificationPrefs: { ...DEFAULT_PREFS, ...(stored.notificationPrefs ?? {}) },
        userEvents: Array.isArray(stored.userEvents) ? stored.userEvents : [],
        deletedEventIds: Array.isArray(stored.deletedEventIds) ? stored.deletedEventIds : [],
        userCivicMessages: Array.isArray(stored.userCivicMessages) ? stored.userCivicMessages : [],
        upvotedCivicIds: Array.isArray(stored.upvotedCivicIds) ? stored.upvotedCivicIds : [],
      });
      setReady(true);
    })();
  }, []);

  const update = useCallback((fn: (prev: PersistedData) => PersistedData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
    saveJson(KEYS.data, next);
  }, []);

  const pushNotification = useCallback(
    (notif: Omit<UserNotification, 'id' | 'createdAt' | 'read'>) => {
      const item: UserNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };
      update((p) => ({
        ...p,
        notifications: [item, ...(p.notifications ?? [])],
      }));
    },
    [update],
  );

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
      pushNotification({
        title: `Potwierdzono rezerwację: ${event.title}`,
        body: `Twój kod wejścia to ${booking.code}. Miejsce: ${event.venue}.`,
        kind: 'event',
      });
      return { ok: true, booking };
    },
    [allBookingsFor, pushNotification, update],
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
        path: geo.path,
        lengthLabel: lengthLabel?.trim() || '500 m',
      };
      update((p) => ({ ...p, userIncidents: [item, ...p.userIncidents] }));
      pushNotification({
        title: `Dodano zgłoszenie drogowe: ${location.trim()}`,
        body: 'Twoje zgłoszenie jest widoczne na mapie ruchu w Toruniu.',
        kind: 'transit',
      });
      return item;
    },
    [pushNotification, update, user],
  );

  const addNotice = useCallback<AppDataValue['addNotice']>(
    async ({ type, lines, stopId, stop, description }) => {
      await wait(450);
      const matchedStop =
        TRANSIT_STOPS.find((s) => s.id === stopId) ??
        TRANSIT_STOPS.find((s) => s.name.toLowerCase() === stop.trim().toLowerCase()) ??
        TRANSIT_STOPS[0];
      const item: TransitNotice = {
        id: `tn-user-${Date.now()}`,
        type,
        lines: lines.length ? lines : matchedStop.lines.slice(0, 1),
        stopId: matchedStop.id,
        stop: matchedStop.name,
        location: `Przystanek: ${matchedStop.name}`,
        reportedAt: new Date().toISOString(),
        severity: 'medium',
        impact: 'Zgłoszenie pasażera',
        status: 'Niezweryfikowane (przystanek)',
        description: description.trim(),
        source: 'user',
        author: user?.name ?? 'Gość',
        lat: matchedStop.lat,
        lng: matchedStop.lng,
        path: [],
        lengthLabel: 'Przystanek',
      };
      update((p) => ({ ...p, userNotices: [item, ...p.userNotices] }));
      pushNotification({
        title: `Zgłoszenie MZK (${matchedStop.name})`,
        body: `Przyjęto komunikat dla linii ${item.lines.join(', ')}. Oczekuje na weryfikację dyspozytora.`,
        kind: 'transit',
      });
      return item;
    },
    [pushNotification, update, user],
  );

  const incidents = useMemo(
    () =>
      [...data.userIncidents, ...TRAFFIC_INCIDENTS].map((i) => {
        const fallback = inferTorunRoadGeometry(i.location || '');
        return {
          ...i,
          lat: Number.isFinite(i.lat) ? i.lat : fallback.lat,
          lng: Number.isFinite(i.lng) ? i.lng : fallback.lng,
          path:
            Array.isArray(i.path) &&
            i.path.length >= 2 &&
            i.path.every((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
              ? i.path
              : fallback.path,
          lengthLabel: i.lengthLabel ?? '600 m',
        };
      }),
    [data.userIncidents],
  );

  const notices = useMemo(
    () =>
      [...data.userNotices, ...TRANSIT_NOTICES].map((n) => {
        const matchedStop =
          TRANSIT_STOPS.find((s) => s.id === n.stopId) ??
          TRANSIT_STOPS.find((s) => s.name === n.stop) ??
          TRANSIT_STOPS[0];
        return {
          ...n,
          stopId: n.stopId ?? matchedStop.id,
          lat: Number.isFinite(n.lat) ? n.lat : matchedStop.lat,
          lng: Number.isFinite(n.lng) ? n.lng : matchedStop.lng,
          path:
            n.source === 'sample' &&
            Array.isArray(n.path) &&
            n.path.length >= 2 &&
            n.path.every((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
              ? n.path
              : [],
          lengthLabel: n.source === 'sample' ? (n.lengthLabel ?? '1,5 km') : 'Przystanek',
        };
      }),
    [data.userNotices],
  );

  const hasUpvotedCivic = useCallback(
    (id: string) => (data.upvotedCivicIds ?? []).includes(id),
    [data.upvotedCivicIds],
  );

  const toggleCivicUpvote = useCallback(
    (id: string) => {
      const was = (dataRef.current.upvotedCivicIds ?? []).includes(id);
      update((p) => ({
        ...p,
        upvotedCivicIds: was
          ? (p.upvotedCivicIds ?? []).filter((x) => x !== id)
          : [...(p.upvotedCivicIds ?? []), id],
      }));
      return !was;
    },
    [update],
  );

  const addCivicMessage = useCallback<AppDataValue['addCivicMessage']>(
    async ({ category, department, title, district, description }) => {
      await wait(450);
      const refNum = `UMT-2026-${Math.floor(4820 + Math.random() * 900)}`;
      const msg: CivicMessage = {
        id: `civ-user-${Date.now()}`,
        referenceCode: refNum,
        category,
        department,
        title: title.trim(),
        district: district.trim(),
        description: description.trim(),
        author: user?.name ?? 'Mieszkaniec Torunia',
        createdAt: new Date().toISOString(),
        status: 'new',
        statusLabel: 'Zarejestrowano w Urzędzie Miasta',
        upvotes: 1,
        isMine: true,
      };
      update((p) => ({
        ...p,
        userCivicMessages: [msg, ...(p.userCivicMessages ?? [])],
      }));
      pushNotification({
        title: `Urząd Miasta przyjął pismo (${refNum})`,
        body: `Twoja sprawa „${msg.title}” została przekazana do: ${department}.`,
        kind: 'city',
      });
      return msg;
    },
    [pushNotification, update, user],
  );

  const civicMessages = useMemo(
    () =>
      [...(data.userCivicMessages ?? []), ...INITIAL_CIVIC_MESSAGES].map((m) => ({
        ...m,
        upvotes: m.upvotes + ((data.upvotedCivicIds ?? []).includes(m.id) ? 1 : 0),
      })),
    [data.userCivicMessages, data.upvotedCivicIds],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      update((p) => ({
        ...p,
        notifications: (p.notifications ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
    [update],
  );

  const markAllNotificationsRead = useCallback(() => {
    update((p) => ({
      ...p,
      notifications: (p.notifications ?? []).map((n) => ({ ...n, read: true })),
    }));
  }, [update]);

  const toggleNotificationPref = useCallback(
    (key: keyof NotificationPrefs) => {
      update((p) => ({
        ...p,
        notificationPrefs: {
          ...(p.notificationPrefs ?? DEFAULT_PREFS),
          [key]: !(p.notificationPrefs ?? DEFAULT_PREFS)[key],
        },
      }));
    },
    [update],
  );

  const setTaxVerified = useCallback(
    (verified: boolean) => {
      update((p) => ({
        ...p,
        taxVerified: verified,
      }));
    },
    [update],
  );

  const allEvents = useMemo(() => {
    const deleted = new Set(data.deletedEventIds ?? []);
    return [...(data.userEvents ?? []), ...EVENTS].filter((e) => !deleted.has(e.id));
  }, [data.userEvents, data.deletedEventIds]);

  const deleteEvent = useCallback(
    (eventId: string) => {
      update((p) => {
        const deleted = p.deletedEventIds ?? [];
        return {
          ...p,
          userEvents: (p.userEvents ?? []).filter((e) => e.id !== eventId),
          deletedEventIds: deleted.includes(eventId) ? deleted : [...deleted, eventId],
          interested: (p.interested ?? []).filter((id) => id !== eventId),
        };
      });
    },
    [update],
  );

  const addEvent = useCallback<AppDataValue['addEvent']>(
    async ({ title, category, venue, address, lat, lng, isFree, priceZl, description }) => {
      await wait(300);
      const start = new Date(Date.now() + 24 * 3600 * 1000);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start.getTime() + 2 * 3600 * 1000);
      const item: CityEvent = {
        id: `ev-user-${Date.now()}`,
        title: title.trim(),
        category,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        venue: venue.trim(),
        address: address.trim() || venue.trim(),
        lat,
        lng,
        isFree,
        priceZl: isFree ? undefined : priceZl ?? 25,
        type: 'open',
        interested: 1,
        description: description.trim(),
        organizer: user?.name ?? 'Mieszkaniec Torunia',
      };
      update((p) => ({
        ...p,
        userEvents: [item, ...(p.userEvents ?? [])],
      }));
      pushNotification({
        title: `Dodano wydarzenie: ${item.title}`,
        body: `Lokalizacja: ${item.venue}`,
        kind: 'event',
      });
      return item;
    },
    [pushNotification, update, user],
  );

  const unreadNotificationCount = useMemo(
    () => (data.notifications ?? []).filter((n) => !n.read).length,
    [data.notifications],
  );

  const value: AppDataValue = {
    ready,
    events: allEvents,
    addEvent,
    deleteEvent,
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
    civicMessages,
    hasUpvotedCivic,
    toggleCivicUpvote,
    addCivicMessage,
    notifications: data.notifications ?? INITIAL_NOTIFICATIONS,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    notificationPrefs: data.notificationPrefs ?? DEFAULT_PREFS,
    toggleNotificationPref,
    taxVerified: Boolean(data.taxVerified),
    setTaxVerified,
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
