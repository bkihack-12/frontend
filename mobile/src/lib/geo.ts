export interface LatLng {
  lat: number;
  lng: number;
}

/** Reference point for "distance" values in the demo: Rynek Staromiejski (no GPS permission needed). */
export const DEMO_USER_LOCATION: LatLng = { lat: 53.01025, lng: 18.60455 };
export const TORUN_CENTER: LatLng = { lat: 53.0128, lng: 18.6005 };

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* ---------- Web-Mercator helpers for the custom slippy map ---------- */

export const TILE_SIZE = 256;

/** World pixel coordinates (at the given fractional zoom) of a lat/lng. */
export function project(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((p.lng + 180) / 360) * scale;
  const sin = Math.sin((p.lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function unproject(x: number, y: number, zoom: number): LatLng {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/** Metres represented by one world pixel at a latitude and zoom. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

