export type EventCategory =
  | 'muzyka'
  | 'sport'
  | 'kultura'
  | 'jedzenie'
  | 'rodzina'
  | 'turystyka'
  | 'edukacja';

export type EventType = 'open' | 'limited';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface CityEvent {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
  isFree: boolean;
  priceZl?: number;
  type: EventType;
  capacity?: number;
  taken?: number;
  action?: 'register' | 'ticket';
  interested: number;
  description: string;
  organizer: string;
}

export interface Booking {
  eventId: string;
  code: string;
  bookedAt: string;
}

export type IncidentType = 'roadworks' | 'jam' | 'accident' | 'other';
export type Severity = 'low' | 'medium' | 'high';

export interface TrafficIncident {
  id: string;
  type: IncidentType;
  title: string;
  location: string;
  reportedAt: string;
  severity: Severity;
  impact: string;
  status: string;
  description: string;
  source: 'sample' | 'user';
  author?: string;
  /** Współrzędne środka utrudnienia na mapie. */
  lat: number;
  lng: number;
  /** Odcinek zapchanej lub remontowanej ulicy rysowany na mapie. */
  path: MapPoint[];
  /** Długość utrudnienia / korka (np. "1,3 km"). */
  lengthLabel: string;
}

export type NoticeType = 'delay' | 'interruption' | 'reroute' | 'other';

export interface TransitNotice {
  id: string;
  type: NoticeType;
  lines: string[];
  stop: string;
  location: string;
  reportedAt: string;
  severity: Severity;
  impact: string;
  status: string;
  description: string;
  source: 'sample' | 'user';
  author?: string;
  /** Współrzędne przystanku / miejsca utrudnienia. */
  lat: number;
  lng: number;
  /** Przebieg odcinka linii komunikacji miejskiej objętego komunikatem. */
  path: MapPoint[];
  /** Długość objętego odcinka trasy (np. "2,1 km"). */
  lengthLabel: string;
}

export type OfferKind = 'offer' | 'sponsored' | 'info';
export type OfferCategory = 'gastronomia' | 'kultura' | 'uslugi' | 'sport' | 'miasto';

export interface CityOffer {
  id: string;
  kind: OfferKind;
  category: OfferCategory;
  business: string;
  title: string;
  location: string;
  address: string;
  expiresAt?: string;
  conditions: string;
  description: string;
  tkm: boolean;
  /** Krótka etykieta benefitu dla mieszkańca, np. "-30% z Kartą" */
  benefitTag?: string;
  hours?: string;
  code?: string;
  sponsor?: string;
}

export interface ResidentBenefit {
  id: string;
  title: string;
  discount: string;
  place: string;
  category: 'transport' | 'kultura' | 'sport' | 'rekreacja' | 'parking';
  description: string;
  icon: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type SessionUser = Pick<DemoUser, 'id' | 'name' | 'email' | 'createdAt'>;
