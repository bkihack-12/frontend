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

export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface TransitNotice {
  id: string;
  type: NoticeType;
  lines: string[];
  stopId?: string;
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
  /** Przebieg odcinka linii komunikacji miejskiej objętego zweryfikowanym komunikatem. */
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
  /** Dane logotypu firmy / przedsiębiorstwa partnerskiego */
  logoText?: string;
  logoColor?: string;
  logoBg?: string;
  logoIcon?: string;
  isPrivatePartner?: boolean;
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

export type CivicCategory = 'wniosek' | 'zgloszenie' | 'skarga' | 'pytanie';

export type CivicStatus = 'new' | 'in_review' | 'answered' | 'implemented';

export interface CivicMessage {
  id: string;
  referenceCode: string;
  category: CivicCategory;
  department: string;
  title: string;
  district: string;
  description: string;
  author: string;
  createdAt: string;
  status: CivicStatus;
  statusLabel: string;
  officialReply?: string;
  upvotes: number;
  isMine?: boolean;
}

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: 'city' | 'transit' | 'event' | 'offer';
}

export interface NotificationPrefs {
  transitAlerts: boolean;
  eventReminders: boolean;
  authorityReplies: boolean;
  partnerDiscounts: boolean;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type SessionUser = Pick<DemoUser, 'id' | 'name' | 'email' | 'createdAt'>;

