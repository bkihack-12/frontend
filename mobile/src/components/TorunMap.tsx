import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  GestureResponderEvent,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Path, Polyline, RadialGradient, Stop } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import type { CityEvent, MapPoint, TransitStop } from '../types';
import { CATEGORY_META } from '../data/events';
import { DEMO_USER_LOCATION, LatLng, TORUN_CENTER, metersPerPixel, project, unproject } from '../lib/geo';
import { colors, font, radius, shadow, spacing, TOUCH } from '../theme';

/**
 * Podkład wektorowy OpenFreeMap (MapLibre GL JS - styl Liberty) + wbudowany podkład
 * wektorowy Torunia (Wisła, główne arterie i dzielnice) jako natychmiastowy fallback.
 * Nie wymaga klucza API i nie podlega blokadom 403 tile.openstreetmap.org.
 */
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const MIN_ZOOM = 11.5;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 13.7;

const OPENFREEMAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #EEF1F5; }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var pending = { lng: ${TORUN_CENTER.lng}, lat: ${TORUN_CENTER.lat}, zoom: ${DEFAULT_ZOOM - 1}, bearing: 0 };
    var map = null;
    function init() {
      if (!window.maplibregl) { setTimeout(init, 40); return; }
      map = new maplibregl.Map({
        container: 'map',
        style: '${OPENFREEMAP_STYLE}',
        center: [pending.lng, pending.lat],
        zoom: pending.zoom,
        bearing: pending.bearing || 0,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0
      });
      map.on('load', function() {
        map.jumpTo({ center: [pending.lng, pending.lat], zoom: pending.zoom, bearing: pending.bearing || 0 });
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('loaded');
        }
      });
    }
    window.__setView = function(lng, lat, zoom, bearing) {
      pending = { lng: lng, lat: lat, zoom: zoom, bearing: bearing || 0 };
      if (map) {
        map.jumpTo({ center: [lng, lat], zoom: zoom, bearing: bearing || 0 });
      }
    };
    window.addEventListener('resize', function() {
      if (map) map.resize();
    });
    init();
  </script>
</body>
</html>`;

const BOUNDS = { minLat: 52.95, maxLat: 53.08, minLng: 18.48, maxLng: 18.74 };

/** Wbudowane dane wektorowe Torunia (rzeka Wisła, główne arterie, Starówka) jako podkład / fallback. */
const WISLA_RIVER: LatLng[] = [
  { lat: 53.0145, lng: 18.515 },
  { lat: 53.0102, lng: 18.555 },
  { lat: 53.0055, lng: 18.588 },
  { lat: 53.0052, lng: 18.605 },
  { lat: 53.0085, lng: 18.622 },
  { lat: 53.0105, lng: 18.652 },
  { lat: 53.0045, lng: 18.695 },
];

const MAIN_ARTERIES: LatLng[][] = [
  // Bydgoska -> Plac Rapackiego -> Most Piłsudskiego
  [
    { lat: 53.0155, lng: 18.545 },
    { lat: 53.0138, lng: 18.585 },
    { lat: 53.0087, lng: 18.6029 },
    { lat: 52.9965, lng: 18.596 },
  ],
  // Szosa Chełmińska -> Centrum
  [
    { lat: 53.045, lng: 18.592 },
    { lat: 53.022, lng: 18.5975 },
    { lat: 53.0127, lng: 18.6006 },
  ],
  // Grudziądzka -> Kościuszki -> Żółkiewskiego -> Szosa Lubicka
  [
    { lat: 53.042, lng: 18.621 },
    { lat: 53.021, lng: 18.613 },
    { lat: 53.0185, lng: 18.6435 },
    { lat: 53.0235, lng: 18.685 },
  ],
  // Trasa Wschodnia / Most Zawackiej
  [
    { lat: 53.029, lng: 18.645 },
    { lat: 53.0185, lng: 18.6435 },
    { lat: 53.009, lng: 18.649 },
    { lat: 52.998, lng: 18.652 },
  ],
];

const DISTRICT_LABELS: { name: string; lat: number; lng: number }[] = [
  { name: 'Stare Miasto', lat: 53.0105, lng: 18.6048 },
  { name: 'Bydgoskie Przedm.', lat: 53.0158, lng: 18.578 },
  { name: 'Chełmińskie Przedm.', lat: 53.0225, lng: 18.598 },
  { name: 'Rubinkowo', lat: 53.0225, lng: 18.655 },
  { name: 'Podgórz', lat: 52.9975, lng: 18.598 },
];

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  badge?: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

export interface MapPolylineItem {
  id: string;
  path: MapPoint[];
  color: string;
  /** Etykieta długości / linii wyświetlana na środku odcinka (np. "1,4 km", "Linia 1 · 1,8 km"). */
  label?: string;
  dashed?: boolean;
  /** Czy jest to linia referencyjna w tle (cieńsza, półprzezroczysta). */
  faint?: boolean;
}

interface View_ {
  cx: number;
  cy: number;
  zoom: number;
  bearing: number;
}

const clamp = (v: number, a: number, b: number) =>
  Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : (a + b) / 2;

const normalizeBearing = (deg: number) => {
  if (!Number.isFinite(deg)) return 0;
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180;
  return Math.abs(wrapped) < 0.05 ? 0 : wrapped;
};

const DEFAULT_PROJECTED = project(TORUN_CENTER, 0);

function clampView(v: View_): View_ {
  const tl = project({ lat: BOUNDS.maxLat, lng: BOUNDS.minLng }, 0);
  const br = project({ lat: BOUNDS.minLat, lng: BOUNDS.maxLng }, 0);
  const zoom = Number.isFinite(v.zoom) ? clamp(v.zoom, MIN_ZOOM, MAX_ZOOM) : DEFAULT_ZOOM;
  const cx = Number.isFinite(v.cx) ? clamp(v.cx, tl.x, br.x) : DEFAULT_PROJECTED.x;
  const cy = Number.isFinite(v.cy) ? clamp(v.cy, tl.y, br.y) : DEFAULT_PROJECTED.y;
  const bearing = normalizeBearing(v.bearing ?? 0);
  return { zoom, cx, cy, bearing };
}

function viewFor(center: LatLng, zoom: number, bearing = 0): View_ {
  const safeCenter =
    Number.isFinite(center?.lat) && Number.isFinite(center?.lng) ? center : TORUN_CENTER;
  const p = project(safeCenter, 0);
  return clampView({ cx: p.x, cy: p.y, zoom, bearing });
}

export interface TorunMapHandle {
  focusOn: (p: LatLng, zoom?: number) => void;
  recenter: () => void;
  resetNorth: () => void;
}

interface Props {
  events?: CityEvent[];
  markers?: MapMarkerItem[];
  polylines?: MapPolylineItem[];
  stops?: TransitStop[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  interestedCount?: (e: CityEvent) => number;
  showHeat?: boolean;
  onToggleHeat?: () => void;
  bottomInset?: number;
  hideControls?: boolean;
  pickedPoint?: LatLng | null;
  onPickPoint?: (point: LatLng) => void;
}

interface Cluster {
  key: string;
  x: number;
  y: number;
  members: CityEvent[];
}

export const TorunMap = forwardRef<TorunMapHandle, Props>(function TorunMap(
  {
    events = [],
    markers = [],
    polylines = [],
    stops = [],
    selectedId,
    onSelect,
    interestedCount = (e) => e.interested,
    showHeat = false,
    onToggleHeat,
    bottomInset = 12,
    hideControls,
    pickedPoint,
    onPickPoint,
  },
  ref,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View_>(() => viewFor(TORUN_CENTER, DEFAULT_ZOOM, 0));
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const onPickPointRef = useRef(onPickPoint);
  onPickPointRef.current = onPickPoint;
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const animRef = useRef<number | null>(null);

  const [tilesLoaded, setTilesLoaded] = useState(0);
  const webViewRef = useRef<WebView | null>(null);
  const webMapContainerRef = useRef<React.ComponentRef<typeof View>>(null);
  const webMapRef = useRef<{
    jumpTo: (opts: { center: [number, number]; zoom: number; bearing?: number }) => void;
    resize: () => void;
    remove: () => void;
  } | null>(null);

  const syncBaseMap = useCallback((c: View_) => {
    const center = unproject(c.cx, c.cy, 0);
    const mlZoom = c.zoom - 1;
    const bearing = c.bearing || 0;
    if (Platform.OS === 'web') {
      webMapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom: mlZoom, bearing });
    } else {
      webViewRef.current?.injectJavaScript(
        `window.__setView && window.__setView(${center.lng},${center.lat},${mlZoom},${bearing});true;`,
      );
    }
  }, []);

  const apply = useCallback(
    (v: View_) => {
      const c = clampView(v);
      viewRef.current = c;
      syncBaseMap(c);
      setView(c);
    },
    [syncBaseMap],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const host = webMapContainerRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === 'undefined') return;

    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('maplibre-gl-inline-fix')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'maplibre-gl-inline-fix';
      styleEl.textContent = `
        .maplibregl-map { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; }
        .maplibregl-canvas-container, .maplibregl-canvas { width: 100% !important; height: 100% !important; display: block !important; }
        .maplibregl-ctrl-attrib, .maplibregl-ctrl { display: none !important; }
      `;
      document.head.appendChild(styleEl);
    }

    host.innerHTML = '';
    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;overflow:hidden;';
    host.appendChild(mapDiv);

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    type MLMap = {
      jumpTo: (opts: { center: [number, number]; zoom: number; bearing?: number }) => void;
      resize: () => void;
      remove: () => void;
      on: (ev: string, cb: () => void) => void;
    };
    const mountMap = () => {
      if (cancelled) return;
      const ml = (
        window as unknown as {
          maplibregl?: { Map: new (opts: Record<string, unknown>) => MLMap };
        }
      ).maplibregl;
      if (!ml) {
        setTimeout(mountMap, 50);
        return;
      }
      if (mapDiv.clientWidth === 0 || mapDiv.clientHeight === 0) {
        setTimeout(mountMap, 50);
        return;
      }
      const center = unproject(viewRef.current.cx, viewRef.current.cy, 0);
      const map = new ml.Map({
        container: mapDiv,
        style: OPENFREEMAP_STYLE,
        center: [center.lng, center.lat],
        zoom: viewRef.current.zoom - 1,
        bearing: viewRef.current.bearing || 0,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
      });
      webMapRef.current = map;
      map.resize();
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          map.resize();
          syncBaseMap(viewRef.current);
        });
        ro.observe(mapDiv);
      }
      map.on('load', () => {
        if (!cancelled) {
          map.resize();
          syncBaseMap(viewRef.current);
          setTilesLoaded((n) => n + 1);
        }
      });
    };

    if (
      !(window as unknown as { maplibregl?: unknown }).maplibregl &&
      !document.getElementById('maplibre-gl-js')
    ) {
      const script = document.createElement('script');
      script.id = 'maplibre-gl-js';
      script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      script.async = true;
      script.onload = mountMap;
      document.head.appendChild(script);
    } else {
      mountMap();
    }

    return () => {
      cancelled = true;
      ro?.disconnect();
      webMapRef.current?.remove();
      webMapRef.current = null;
    };
  }, [syncBaseMap]);

  useEffect(() => {
    if (Platform.OS === 'web' && size.w > 0 && size.h > 0) {
      webMapRef.current?.resize();
      syncBaseMap(viewRef.current);
    }
  }, [size.w, size.h, syncBaseMap]);

  const cancelAnim = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target: View_) => {
      cancelAnim();
      const from = viewRef.current;
      const to = clampView(target);
      const dBearing = normalizeBearing(to.bearing - from.bearing);
      const start = Date.now();
      const duration = 320;
      const step = () => {
        const t = clamp((Date.now() - start) / duration, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        apply({
          cx: from.cx + (to.cx - from.cx) * e,
          cy: from.cy + (to.cy - from.cy) * e,
          zoom: from.zoom + (to.zoom - from.zoom) * e,
          bearing: normalizeBearing(from.bearing + dBearing * e),
        });
        animRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [apply, cancelAnim],
  );

  useEffect(() => cancelAnim, [cancelAnim]);

  useImperativeHandle(
    ref,
    () => ({
      focusOn: (p, zoom) =>
        animateTo(
          viewFor(p, zoom ?? Math.max(viewRef.current.zoom, 14.6), viewRef.current.bearing),
        ),
      recenter: () => animateTo(viewFor(TORUN_CENTER, DEFAULT_ZOOM, 0)),
      resetNorth: () => animateTo({ ...viewRef.current, bearing: 0 }),
    }),
    [animateTo],
  );

  const zoomAround = useCallback((dZoom: number, fx: number, fy: number, base?: View_) => {
    const v = base ?? viewRef.current;
    const z2 = clamp(v.zoom + dZoom, MIN_ZOOM, MAX_ZOOM);
    const s1 = Math.pow(2, v.zoom);
    const s2 = Math.pow(2, z2);
    const safeFx = Number.isFinite(fx) ? fx : 0;
    const safeFy = Number.isFinite(fy) ? fy : 0;
    const rad = ((v.bearing || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rFx = safeFx * cos - safeFy * sin;
    const rFy = safeFx * sin + safeFy * cos;
    const wx = v.cx + rFx / s1;
    const wy = v.cy + rFy / s1;
    return { cx: wx - rFx / s2, cy: wy - rFy / s2, zoom: z2, bearing: v.bearing };
  }, []);

  const gesture = useRef({
    touches: 0,
    midX: 0,
    midY: 0,
    dist: 0,
    angle: 0,
    prevDx: 0,
    prevDy: 0,
  });

  const readTouches = (e: GestureResponderEvent) => {
    const ne = e.nativeEvent as unknown as {
      touches?: { pageX?: number; pageY?: number; clientX?: number; clientY?: number }[];
      pageX?: number;
      pageY?: number;
      clientX?: number;
      clientY?: number;
      locationX?: number;
      locationY?: number;
      shiftKey?: boolean;
      altKey?: boolean;
      buttons?: number;
    };
    const t = ne.touches;
    const getX = (obj?: { pageX?: number; clientX?: number }) =>
      obj?.pageX ?? obj?.clientX ?? ne.pageX ?? ne.clientX ?? ne.locationX ?? 0;
    const getY = (obj?: { pageY?: number; clientY?: number }) =>
      obj?.pageY ?? obj?.clientY ?? ne.pageY ?? ne.clientY ?? ne.locationY ?? 0;
    const rotateMod = Boolean(ne.shiftKey || ne.altKey || ne.buttons === 2);

    if (!t || t.length === 0) {
      return { n: 1, mx: getX(), my: getY(), dist: 0, angle: 0, rotateMod };
    }
    if (t.length >= 2) {
      const ax = getX(t[0]);
      const ay = getY(t[0]);
      const bx = getX(t[1]);
      const by = getY(t[1]);
      return {
        n: 2,
        mx: (ax + bx) / 2,
        my: (ay + by) / 2,
        dist: Math.hypot(ax - bx, ay - by),
        angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
        rotateMod: false,
      };
    }
    return { n: 1, mx: getX(t[0]), my: getY(t[0]), dist: 0, angle: 0, rotateMod };
  };

  const containerOffset = useRef({ x: 0, y: 0 });
  const measure = useCallback(() => {
    containerRef.current?.measureInWindow?.((x: number, y: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        containerOffset.current = { x, y };
      }
    });
  }, []);

  const hitTestRef = useRef<{
    singles: { event: CityEvent; x: number; y: number }[];
    clusters: Cluster[];
    markers: { id: string; x: number; y: number }[];
    stops: { id: string; x: number; y: number }[];
    polylines: {
      id: string;
      pts: { x: number; y: number }[];
      mid: { x: number; y: number };
      faint?: boolean;
      selected: boolean;
    }[];
    selectedId: string | null | undefined;
    onSelect: (id: string | null) => void;
  }>({
    singles: [],
    clusters: [],
    markers: [],
    stops: [],
    polylines: [],
    selectedId: null,
    onSelect: () => {},
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gs) =>
          Math.abs(gs.dx) > 7 || Math.abs(gs.dy) > 7,
        onMoveShouldSetPanResponderCapture: (_e, gs) =>
          Math.abs(gs.dx) > 7 || Math.abs(gs.dy) > 7,
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: (e, gs) => {
          cancelAnim();
          measure();
          const r = readTouches(e);
          gesture.current = {
            touches: r.n,
            midX: r.mx,
            midY: r.my,
            dist: r.dist,
            angle: r.angle,
            prevDx: gs.dx,
            prevDy: gs.dy,
          };
        },
        onPanResponderMove: (e, gs) => {
          const r = readTouches(e);
          const g = gesture.current;
          if (r.n !== g.touches) {
            gesture.current = {
              touches: r.n,
              midX: r.mx,
              midY: r.my,
              dist: r.dist,
              angle: r.angle,
              prevDx: gs.dx,
              prevDy: gs.dy,
            };
            return;
          }
          let v = viewRef.current;
          if (r.n === 2 && g.dist > 0 && r.dist > 0) {
            const { w, h } = sizeRef.current;
            const fx = r.mx - (containerOffset.current.x + w / 2);
            const fy = r.my - (containerOffset.current.y + h / 2);
            const dAngle = normalizeBearing(r.angle - g.angle);
            const nextBearing = normalizeBearing((v.bearing || 0) - dAngle);
            v = { ...v, ...zoomAround(Math.log2(r.dist / g.dist), fx, fy, v), bearing: nextBearing };
            const s = Math.pow(2, v.zoom);
            const ddx = r.mx - g.midX;
            const ddy = r.my - g.midY;
            const rad = (nextBearing * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dWx = (ddx * cos - ddy * sin) / s;
            const dWy = (ddx * sin + ddy * cos) / s;
            apply({ ...v, cx: v.cx - dWx, cy: v.cy - dWy, bearing: nextBearing });
          } else {
            const ddx = gs.dx - g.prevDx;
            const ddy = gs.dy - g.prevDy;
            if (r.rotateMod) {
              const nextBearing = normalizeBearing((v.bearing || 0) + ddx * 0.45);
              apply({ ...v, bearing: nextBearing });
            } else {
              const s = Math.pow(2, v.zoom);
              const rad = ((v.bearing || 0) * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const dWx = (ddx * cos - ddy * sin) / s;
              const dWy = (ddx * sin + ddy * cos) / s;
              apply({ ...v, cx: v.cx - dWx, cy: v.cy - dWy });
            }
          }
          gesture.current = {
            touches: r.n,
            midX: r.mx,
            midY: r.my,
            dist: r.dist,
            angle: r.angle,
            prevDx: gs.dx,
            prevDy: gs.dy,
          };
        },
        onPanResponderRelease: (e, gs) => {
          if (Math.hypot(gs.dx, gs.dy) >= 9) return;
          const ne = e.nativeEvent as unknown as {
            clientX?: number;
            clientY?: number;
            pageX?: number;
            pageY?: number;
            locationX?: number;
            locationY?: number;
          };
          let lx: number | undefined;
          let ly: number | undefined;
          const node = containerRef.current as unknown as {
            getBoundingClientRect?: () => { left: number; top: number };
          } | null;

          if (
            Platform.OS === 'web' &&
            node?.getBoundingClientRect &&
            (ne.clientX !== undefined || ne.pageX !== undefined)
          ) {
            const rect = node.getBoundingClientRect();
            lx = (ne.clientX ?? ne.pageX ?? 0) - rect.left;
            ly = (ne.clientY ?? ne.pageY ?? 0) - rect.top;
          } else if (Number.isFinite(ne.locationX) && Number.isFinite(ne.locationY)) {
            lx = ne.locationX;
            ly = ne.locationY;
          } else {
            const r = readTouches(e);
            lx = r.mx - containerOffset.current.x;
            ly = r.my - containerOffset.current.y;
          }

          const { w, h } = sizeRef.current;
          if (w <= 0 || h <= 0 || lx === undefined || ly === undefined) return;

          const screenToLatLng = (sx: number, sy: number) => {
            const v = viewRef.current;
            const s = Math.pow(2, v.zoom);
            const dx = sx - w / 2;
            const dy = sy - h / 2;
            const rad = ((v.bearing || 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const wx = v.cx + (dx * cos - dy * sin) / s;
            const wy = v.cy + (dx * sin + dy * cos) / s;
            return unproject(wx, wy, 0);
          };

          /* Tryb zaznaczania punktu dla nowego wydarzenia */
          if (onPickPointRef.current) {
            const pt = screenToLatLng(lx, ly);
            if (Number.isFinite(pt.lat) && Number.isFinite(pt.lng)) {
              onPickPointRef.current(pt);
            }
            return;
          }

          /* Hit-test elementów na mapie (szczególnie ważne na urządzeniach mobilnych oraz dla linii ulic/tras) */
          const ht = hitTestRef.current;

          // 1. Pojedyncze wydarzenia
          let bestEvent: { id: string; d: number } | null = null;
          for (const item of ht.singles) {
            const d = Math.hypot(item.x - lx, item.y - ly);
            if (d <= 32 && (!bestEvent || d < bestEvent.d)) {
              bestEvent = { id: item.event.id, d };
            }
          }
          if (bestEvent) {
            ht.onSelect(bestEvent.id === ht.selectedId ? null : bestEvent.id);
            return;
          }

          // 2. Klastry wydarzeń
          for (const c of ht.clusters) {
            if (Math.hypot(c.x - lx, c.y - ly) <= 32) {
              const target = screenToLatLng(c.x, c.y);
              animateTo(
                viewFor(
                  target,
                  Math.min(MAX_ZOOM, viewRef.current.zoom + 1.5),
                  viewRef.current.bearing,
                ),
              );
              return;
            }
          }

          // 3. Znaczniki utrudnień (Ruch / Komunikacja)
          let bestMarker: { id: string; d: number } | null = null;
          for (const m of ht.markers) {
            const d = Math.hypot(m.x - lx, m.y - ly);
            if (d <= 32 && (!bestMarker || d < bestMarker.d)) {
              bestMarker = { id: m.id, d };
            }
          }
          if (bestMarker) {
            ht.onSelect(bestMarker.id === ht.selectedId ? null : bestMarker.id);
            return;
          }

          // 4. Przystanki MZK
          let bestStop: { id: string; d: number } | null = null;
          for (const st of ht.stops) {
            const d = Math.hypot(st.x - lx, st.y - ly);
            if (d <= 28 && (!bestStop || d < bestStop.d)) {
              bestStop = { id: st.id, d };
            }
          }
          if (bestStop) {
            ht.onSelect(bestStop.id === ht.selectedId ? null : bestStop.id);
            return;
          }

          // 5. Odcinki ulic / trasy komunikacji (polylines)
          const distToSeg = (
            px: number,
            py: number,
            x1: number,
            y1: number,
            x2: number,
            y2: number,
          ) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 === 0) return Math.hypot(px - x1, py - y1);
            const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
            return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
          };

          let bestPoly: { id: string; d: number; faint?: boolean } | null = null;
          for (const pl of ht.polylines) {
            let minD = Math.hypot(pl.mid.x - lx, pl.mid.y - 14 - ly);
            for (let i = 0; i < pl.pts.length - 1; i++) {
              const d = distToSeg(
                lx,
                ly,
                pl.pts[i].x,
                pl.pts[i].y,
                pl.pts[i + 1].x,
                pl.pts[i + 1].y,
              );
              if (d < minD) minD = d;
            }
            const threshold = pl.faint ? 18 : 26;
            if (minD <= threshold) {
              if (
                !bestPoly ||
                (bestPoly.faint && !pl.faint) ||
                (Boolean(bestPoly.faint) === Boolean(pl.faint) && minD < bestPoly.d)
              ) {
                bestPoly = { id: pl.id, d: minD, faint: pl.faint };
              }
            }
          }
          if (bestPoly) {
            ht.onSelect(bestPoly.id === ht.selectedId ? null : bestPoly.id);
            return;
          }

          // 6. Kliknięcie w pusty obszar mapy usuwa aktywny focus
          if (ht.selectedId) {
            ht.onSelect(null);
          }
        },
      }),
    [animateTo, apply, cancelAnim, measure, zoomAround],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || !node.addEventListener) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = node.getBoundingClientRect();
      const fx = ev.clientX - rect.left - rect.width / 2;
      const fy = ev.clientY - rect.top - rect.height / 2;
      cancelAnim();
      apply({ ...viewRef.current, ...zoomAround(-ev.deltaY * 0.0025, fx, fy) });
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [apply, cancelAnim, zoomAround]);

  const scale = Math.pow(2, view.zoom);
  const toScreen = useCallback(
    (p: LatLng) => {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
        return { x: -9999, y: -9999 };
      }
      const w = project(p, 0);
      const dx = (w.x - view.cx) * scale;
      const dy = (w.y - view.cy) * scale;
      const rad = ((view.bearing || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const x = size.w / 2 + dx * cos + dy * sin;
      const y = size.h / 2 - dx * sin + dy * cos;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { x: -9999, y: -9999 };
      }
      return { x, y };
    },
    [size.w, size.h, view.cx, view.cy, view.bearing, scale],
  );

  /* ----- Event clusters ----- */
  const { clusters, singles } = useMemo(() => {
    const CELL = 44;
    const cl: Cluster[] = [];
    const ones: { event: CityEvent; x: number; y: number }[] = [];
    const sorted = [...events].sort((a, b) => interestedCount(b) - interestedCount(a));
    for (const ev of sorted) {
      const pt = toScreen(ev);
      if (pt.x < -80 || pt.y < -80 || pt.x > size.w + 80 || pt.y > size.h + 80) continue;
      if (ev.id === selectedId) {
        ones.push({ event: ev, ...pt });
        continue;
      }
      const hit = cl.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < CELL);
      if (hit) {
        hit.x = (hit.x * hit.members.length + pt.x) / (hit.members.length + 1);
        hit.y = (hit.y * hit.members.length + pt.y) / (hit.members.length + 1);
        hit.members.push(ev);
      } else {
        cl.push({ key: ev.id, x: pt.x, y: pt.y, members: [ev] });
      }
    }
    const multi: Cluster[] = [];
    for (const c of cl) {
      if (c.members.length === 1) ones.push({ event: c.members[0], x: c.x, y: c.y });
      else multi.push(c);
    }
    return { clusters: multi, singles: ones };
  }, [events, toScreen, size.w, size.h, selectedId, interestedCount]);

  /* ----- Heat layer: zielony (luźno), żółto-bursztynowy (umiarkowany ruch), czerwony (zatłoczone / za dużo ludzi) ----- */
  const heat = useMemo(() => {
    if (!showHeat || !size.w || events.length === 0) return [];
    return events
      .map((ev) => {
        const n = interestedCount(ev);
        const pt = toScreen(ev);
        const capRatio =
          ev.capacity && ev.capacity > 0 ? (ev.taken ?? 0) / ev.capacity : 0;
        const isCrowded = n >= 260 || capRatio >= 0.92;
        const isModerate = !isCrowded && (n >= 120 || capRatio >= 0.75);
        const level: 'calm' | 'moderate' | 'crowded' = isCrowded
          ? 'crowded'
          : isModerate
            ? 'moderate'
            : 'calm';
        const meters =
          level === 'crowded'
            ? 250 + n * 1.15
            : level === 'moderate'
              ? 195 + n * 0.85
              : 155 + n * 0.7;
        const r = clamp(meters / metersPerPixel(ev.lat, view.zoom), 36, 195);
        const o = level === 'crowded' ? 0.92 : level === 'moderate' ? 0.82 : 0.76;
        return { id: ev.id, x: pt.x, y: pt.y, r, o, level };
      })
      .filter((h) => Number.isFinite(h.x) && Number.isFinite(h.y) && Number.isFinite(h.r));
  }, [events, showHeat, toScreen, size.w, view.zoom, interestedCount]);

  /* ----- Screen-projected polylines (traffic jams / transit routes) ----- */
  const screenPolylines = useMemo(() => {
    if (!size.w || polylines.length === 0) return [];
    return polylines
      .map((pl) => {
        const validPath = (pl.path ?? []).filter(
          (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
        );
        const pts = validPath
          .map(toScreen)
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > -5000 && p.y > -5000);
        if (pts.length < 2) return null;
        const pointsAttr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const midIdx = Math.floor(pts.length / 2);
        const mid =
          pts.length >= 2 && pts.length % 2 === 0
            ? {
                x: (pts[midIdx - 1].x + pts[midIdx].x) / 2,
                y: (pts[midIdx - 1].y + pts[midIdx].y) / 2,
              }
            : pts[midIdx] ?? { x: 0, y: 0 };
        return {
          ...pl,
          pts,
          pointsAttr,
          mid,
          selected: pl.id === selectedId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [polylines, size.w, toScreen, selectedId]);

  /* Aktualizacja referencji dla hit-testingu mobilnego i czyszczenia focusu */
  hitTestRef.current = {
    singles,
    clusters,
    markers: markers.map((m) => ({ id: m.id, ...toScreen(m) })),
    stops: stops.map((s) => ({ id: s.id, ...toScreen(s) })),
    polylines: screenPolylines,
    selectedId,
    onSelect,
  };

  /* ----- Vector basemap paths (always rendered beneath / when tiles not loaded) ----- */
  const riverPoints = useMemo(
    () => WISLA_RIVER.map(toScreen).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    [toScreen],
  );
  const arteryPolylines = useMemo(
    () =>
      MAIN_ARTERIES.map((art, idx) => ({
        key: `art-${idx}`,
        pts: art.map(toScreen).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      })),
    [toScreen],
  );

  const user = toScreen(DEMO_USER_LOCATION);

  const zoomBy = (d: number) => {
    cancelAnim();
    animateTo({ ...viewRef.current, ...zoomAround(d, 0, 0) });
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => {
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        measure();
      }}
      {...pan.panHandlers}
      accessibilityLabel="Mapa Torunia"
    >
      {/* Wbudowany wektorowy podkład Torunia (zawsze widoczny pod kafelkami / offline) */}
      {size.w > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size.w} height={size.h}>
            {arteryPolylines.map((a) => (
              <Polyline
                key={a.key}
                points={a.pts}
                fill="none"
                stroke="#E2E6EC"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            <Polyline
              points={riverPoints}
              fill="none"
              stroke="#CBE0F0"
              strokeWidth={Math.max(14, (view.zoom - 11) * 9)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          {tilesLoaded === 0
            ? DISTRICT_LABELS.map((d) => {
                const p = toScreen(d);
                return (
                  <Text
                    key={d.name}
                    style={[styles.districtLabel, { left: p.x - 50, top: p.y - 8 }]}
                  >
                    {d.name}
                  </Text>
                );
              })
            : null}
        </View>
      ) : null}

      {/* Podkład wektorowy OpenFreeMap (MapLibre GL JS) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Platform.OS === 'web' ? (
          <View ref={webMapContainerRef} style={StyleSheet.absoluteFill} />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: OPENFREEMAP_HTML, baseUrl: 'https://tiles.openfreemap.org' }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            androidLayerType="hardware"
            onLoadEnd={() => syncBaseMap(viewRef.current)}
            onMessage={() => {
              syncBaseMap(viewRef.current);
              setTilesLoaded((n) => n + 1);
            }}
          />
        )}
      </View>
      <Text style={styles.attribution}>© OpenFreeMap · © OpenMapTiles · © OpenStreetMap</Text>

      {/* Warstwa aktywności + odcinki ulic / linii komunikacji */}
      {size.w > 0 && (showHeat || screenPolylines.length > 0) ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size.w} height={size.h}>
            <Defs>
              {/* Luźno / spokojnie — łagodny zielono-szmaragdowy gradient */}
              <RadialGradient id="heatCalm" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.62" />
                <Stop offset="38%" stopColor="#34D399" stopOpacity="0.44" />
                <Stop offset="74%" stopColor="#6EE7B7" stopOpacity="0.22" />
                <Stop offset="100%" stopColor="#A7F3D0" stopOpacity="0" />
              </RadialGradient>
              {/* Umiarkowany ruch — ciepły żółto-bursztynowy gradient (bez czerwieni) */}
              <RadialGradient id="heatModerate" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.68" />
                <Stop offset="36%" stopColor="#FBBF24" stopOpacity="0.50" />
                <Stop offset="72%" stopColor="#FDE047" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
              </RadialGradient>
              {/* Zatłoczone / za dużo ludzi — intensywny czerwony gradient ostrzegawczy */}
              <RadialGradient id="heatCrowded" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#DC2626" stopOpacity="0.88" />
                <Stop offset="32%" stopColor="#EF4444" stopOpacity="0.72" />
                <Stop offset="64%" stopColor="#F97316" stopOpacity="0.45" />
                <Stop offset="86%" stopColor="#FBBF24" stopOpacity="0.20" />
                <Stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="heatCrowdedCore" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#991B1B" stopOpacity="0.88" />
                <Stop offset="55%" stopColor="#DC2626" stopOpacity="0.55" />
                <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {showHeat
              ? heat.map((h) => {
                  const gradId =
                    h.level === 'crowded'
                      ? 'url(#heatCrowded)'
                      : h.level === 'moderate'
                        ? 'url(#heatModerate)'
                        : 'url(#heatCalm)';
                  return (
                    <React.Fragment key={h.id}>
                      <Circle cx={h.x} cy={h.y} r={h.r} fill={gradId} opacity={h.o} />
                      {h.level === 'crowded' ? (
                        <Circle
                          cx={h.x}
                          cy={h.y}
                          r={h.r * 0.48}
                          fill="url(#heatCrowdedCore)"
                          opacity={0.85}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })
              : null}
            {screenPolylines.map((pl) => {
              const strokeW = pl.faint ? 4.5 : pl.selected ? 10 : 7.5;
              return (
                <React.Fragment key={pl.id}>
                  {/* Obrys (casing) dla czytelności */}
                  {!pl.faint ? (
                    <Polyline
                      points={pl.pointsAttr}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={strokeW + 5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.98}
                    />
                  ) : null}
                  <Polyline
                    points={pl.pointsAttr}
                    fill="none"
                    stroke={pl.color}
                    strokeWidth={strokeW}
                    strokeDasharray={pl.dashed ? '9, 6' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={pl.faint ? 0.65 : 0.98}
                  />
                  {/* Punkty końcowe zweryfikowanego odcinka utrudnienia */}
                  {!pl.faint && pl.pts.length >= 2 ? (
                    <>
                      <Circle
                        cx={pl.pts[0].x}
                        cy={pl.pts[0].y}
                        r={5}
                        fill="#FFFFFF"
                        stroke={pl.color}
                        strokeWidth={2.8}
                      />
                      <Circle
                        cx={pl.pts[pl.pts.length - 1].x}
                        cy={pl.pts[pl.pts.length - 1].y}
                        r={5}
                        fill="#FFFFFF"
                        stroke={pl.color}
                        strokeWidth={2.8}
                      />
                    </>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      ) : null}

      {/* Etykiety długości zapchanych ulic / zweryfikowanych odcinków utrudnień na mapie */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={onPickPoint ? 'none' : 'box-none'}
      >
        {screenPolylines.map((pl) => {
          if (!pl.label || pl.faint) return null;
          return (
            <Pressable
              key={`lbl-${pl.id}`}
              hitSlop={12}
              onPress={() => onSelect(pl.selected ? null : pl.id)}
              style={[
                styles.segmentLabel,
                {
                  left: pl.mid.x - 52,
                  top: pl.mid.y - 30,
                  borderColor: pl.color,
                  backgroundColor: pl.selected ? pl.color : '#FFFFFF',
                },
              ]}
            >
              <View style={[styles.segmentDot, { backgroundColor: pl.selected ? '#FFFFFF' : pl.color }]} />
              <Text
                style={[styles.segmentLabelText, { color: pl.selected ? '#FFFFFF' : colors.ink }]}
                numberOfLines={1}
              >
                {pl.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Punkt orientacyjny centrum (Rynek) */}
      <View
        pointerEvents="none"
        style={[styles.userHalo, { left: user.x - 12, top: user.y - 12 }]}
      >
        <View style={styles.userDot} />
      </View>

      {/* Przystanki komunikacji miejskiej, znaczniki wydarzeń oraz zgłoszeń */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={onPickPoint ? 'none' : 'box-none'}
      >
        {stops.map((s) => {
          const pt = toScreen(s);
          if (pt.x < -60 || pt.y < -60 || pt.x > size.w + 60 || pt.y > size.h + 60) return null;
          const selected = s.id === selectedId;
          return (
            <Pressable
              key={s.id}
              hitSlop={10}
              onPress={() => onSelect(selected ? null : s.id)}
              style={[
                styles.stopHit,
                { left: pt.x - 21, top: pt.y - 21, zIndex: selected ? 55 : 3 },
              ]}
            >
              {selected ? (
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {s.name} ({s.lines.join(', ')})
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.stopPin,
                  selected && {
                    backgroundColor: colors.river,
                    borderColor: colors.ink,
                    transform: [{ scale: 1.22 }],
                  },
                ]}
              >
                <Ionicons name="bus" size={12} color={selected ? '#FFFFFF' : colors.river} />
              </View>
            </Pressable>
          );
        })}

        {clusters.map((c) => (
          <Pressable
            key={`cl-${c.key}`}
            hitSlop={10}
            onPress={() => {
              const dx = c.x - size.w / 2;
              const dy = c.y - size.h / 2;
              const rad = ((viewRef.current.bearing || 0) * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const target = unproject(
                viewRef.current.cx + (dx * cos - dy * sin) / scale,
                viewRef.current.cy + (dx * sin + dy * cos) / scale,
                0,
              );
              animateTo(
                viewFor(target, Math.min(MAX_ZOOM, view.zoom + 1.5), viewRef.current.bearing),
              );
            }}
            style={[styles.clusterHit, { left: c.x - 27, top: c.y - 27 }]}
          >
            <View style={styles.cluster}>
              <Text style={styles.clusterText}>{c.members.length}</Text>
            </View>
          </Pressable>
        ))}

        {singles.map(({ event, x, y }) => {
          const meta = CATEGORY_META[event.category];
          const selected = event.id === selectedId;
          return (
            <Pressable
              key={event.id}
              hitSlop={10}
              onPress={() => onSelect(selected ? null : event.id)}
              style={[
                styles.markerHit,
                { left: x - 26, top: y - 26, zIndex: selected ? 50 : 2 },
              ]}
            >
              {selected ? (
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.pin,
                  { backgroundColor: meta.color },
                  selected && { transform: [{ scale: 1.18 }], borderColor: colors.ink },
                ]}
              >
                <Ionicons name={meta.icon as never} size={16} color="#fff" />
              </View>
            </Pressable>
          );
        })}

        {markers.map((m) => {
          const pt = toScreen(m);
          if (pt.x < -80 || pt.y < -80 || pt.x > size.w + 80 || pt.y > size.h + 80) return null;
          const selected = m.id === selectedId;
          return (
            <Pressable
              key={m.id}
              hitSlop={10}
              onPress={() => onSelect(selected ? null : m.id)}
              style={[
                styles.markerHit,
                { left: pt.x - 26, top: pt.y - 26, zIndex: selected ? 60 : 5 },
              ]}
            >
              {selected ? (
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {m.title}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.pin,
                  { backgroundColor: m.color },
                  selected && { transform: [{ scale: 1.18 }], borderColor: colors.ink },
                ]}
              >
                <Ionicons name={m.icon} size={16} color="#fff" />
              </View>
            </Pressable>
          );
        })}

        {pickedPoint
          ? (() => {
              const pt = toScreen(pickedPoint);
              return (
                <View
                  pointerEvents="none"
                  style={[
                    styles.markerHit,
                    { left: pt.x - 26, top: pt.y - 26, zIndex: 90 },
                  ]}
                >
                  <View style={[styles.markerLabel, { backgroundColor: colors.brick }]}>
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      Wybrane miejsce
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.pin,
                      {
                        backgroundColor: colors.brick,
                        borderColor: '#FFFFFF',
                        transform: [{ scale: 1.22 }],
                      },
                    ]}
                  >
                    <Ionicons name="location" size={18} color="#FFFFFF" />
                  </View>
                </View>
              );
            })()
          : null}
      </View>

      {/* Przyciski sterowania mapą */}
      {hideControls ? null : (
        <View style={[styles.controls, { bottom: bottomInset + spacing.sm }]} pointerEvents="box-none">
          <CompassButton
            bearing={view.bearing || 0}
            onPress={() => animateTo({ ...viewRef.current, bearing: 0 })}
          />
          <MapButton
            icon="sync-outline"
            label="Zmień orientację mapy (obróć o 45°)"
            active={Math.abs(view.bearing || 0) > 1}
            onPress={() =>
              animateTo({
                ...viewRef.current,
                bearing: normalizeBearing((viewRef.current.bearing || 0) + 45),
              })
            }
          />
          {onToggleHeat ? (
            <MapButton
              icon="flame-outline"
              label="Warstwa aktywności"
              active={showHeat}
              onPress={onToggleHeat}
            />
          ) : null}
          <MapButton
            icon="locate-outline"
            label="Wyśrodkuj na Toruniu"
            onPress={() => animateTo(viewFor(TORUN_CENTER, DEFAULT_ZOOM, 0))}
          />
          <MapButton icon="add" label="Przybliż" onPress={() => zoomBy(1)} />
          <MapButton icon="remove" label="Oddal" onPress={() => zoomBy(-1)} />
        </View>
      )}
    </View>
  );
});

/** Ikona kompasu w stylu Google Maps — wskazuje północ i po kliknięciu przywraca orientację „Północ na górze”. */
function CompassButton({
  bearing,
  onPress,
}: {
  bearing: number;
  onPress: () => void;
}) {
  const isRotated = Math.abs(bearing) > 1;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Przywróć orientację: Północ na górze"
      style={({ pressed }) => [
        styles.mapBtn,
        isRotated && { borderColor: colors.brick, borderWidth: 1.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={{
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${-bearing}deg` }],
        }}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24">
          {/* Czerwona igła północna */}
          <Path d="M12 2 L15.4 12 L8.6 12 Z" fill="#DC2626" />
          {/* Ciemnoszara igła południowa */}
          <Path d="M12 22 L15.4 12 L8.6 12 Z" fill="#64748B" />
          <Circle cx="12" cy="12" r="2" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
        </Svg>
      </View>
      <View style={styles.northBadge} pointerEvents="none">
        <Text style={[styles.northBadgeText, isRotated && { color: colors.brick }]}>N</Text>
      </View>
    </Pressable>
  );
}

function MapButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.mapBtn,
        active && { backgroundColor: colors.brick, borderColor: colors.brick },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? '#fff' : colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    color: '#4B5563',
    fontSize: 9,
  },
  districtLabel: {
    position: 'absolute',
    width: 100,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#7B8798',
  },
  userHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 105, 144, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.river,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopHit: {
    position: 'absolute',
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.river,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  markerHit: {
    position: 'absolute',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerLabel: {
    position: 'absolute',
    top: -24,
    maxWidth: 210,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignSelf: 'center',
  },
  markerLabelText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  clusterHit: {
    position: 'absolute',
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cluster: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.river,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  clusterText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  segmentLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    ...shadow.card,
  },
  segmentDot: { width: 6, height: 6, borderRadius: 3 },
  segmentLabelText: { fontSize: 11, fontWeight: '700' },
  controls: { position: 'absolute', right: spacing.md, gap: 8 },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  northBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  northBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#DC2626',
  },
});
