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
import { Ionicons } from '@expo/vector-icons';
import type { CityEvent, MapPoint, TransitStop } from '../types';
import { CATEGORY_META } from '../data/events';
import { DEMO_USER_LOCATION, LatLng, TORUN_CENTER, metersPerPixel, project, unproject } from '../lib/geo';
import { colors, font, radius, shadow, spacing, TOUCH } from '../theme';

/**
 * Rzeczywiste kafelki OpenStreetMap + wbudowany wektorowy podkład Torunia (Wisła, mosty,
 * główne arterie i dzielnice), dzięki czemu mapa jest zawsze czytelna (również offline).
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MIN_ZOOM = 11.5;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 13.7;
const TILE = 256;

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
}

const clamp = (v: number, a: number, b: number) =>
  Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : (a + b) / 2;

const DEFAULT_PROJECTED = project(TORUN_CENTER, 0);

function clampView(v: View_): View_ {
  const tl = project({ lat: BOUNDS.maxLat, lng: BOUNDS.minLng }, 0);
  const br = project({ lat: BOUNDS.minLat, lng: BOUNDS.maxLng }, 0);
  const zoom = Number.isFinite(v.zoom) ? clamp(v.zoom, MIN_ZOOM, MAX_ZOOM) : DEFAULT_ZOOM;
  const cx = Number.isFinite(v.cx) ? clamp(v.cx, tl.x, br.x) : DEFAULT_PROJECTED.x;
  const cy = Number.isFinite(v.cy) ? clamp(v.cy, tl.y, br.y) : DEFAULT_PROJECTED.y;
  return { zoom, cx, cy };
}

function viewFor(center: LatLng, zoom: number): View_ {
  const safeCenter =
    Number.isFinite(center?.lat) && Number.isFinite(center?.lng) ? center : TORUN_CENTER;
  const p = project(safeCenter, 0);
  return clampView({ cx: p.x, cy: p.y, zoom });
}

export interface TorunMapHandle {
  focusOn: (p: LatLng, zoom?: number) => void;
  recenter: () => void;
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
  },
  ref,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View_>(() => viewFor(TORUN_CENTER, DEFAULT_ZOOM));
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const animRef = useRef<number | null>(null);

  const [tilesLoaded, setTilesLoaded] = useState(0);

  const apply = useCallback((v: View_) => {
    const c = clampView(v);
    viewRef.current = c;
    setView(c);
  }, []);

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
      const start = Date.now();
      const duration = 320;
      const step = () => {
        const t = clamp((Date.now() - start) / duration, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        apply({
          cx: from.cx + (to.cx - from.cx) * e,
          cy: from.cy + (to.cy - from.cy) * e,
          zoom: from.zoom + (to.zoom - from.zoom) * e,
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
      focusOn: (p, zoom) => animateTo(viewFor(p, zoom ?? Math.max(viewRef.current.zoom, 14.6))),
      recenter: () => animateTo(viewFor(TORUN_CENTER, DEFAULT_ZOOM)),
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
    const wx = v.cx + safeFx / s1;
    const wy = v.cy + safeFy / s1;
    return { cx: wx - safeFx / s2, cy: wy - safeFy / s2, zoom: z2 };
  }, []);

  const gesture = useRef({ touches: 0, midX: 0, midY: 0, dist: 0, prevDx: 0, prevDy: 0 });

  const readTouches = (e: GestureResponderEvent) => {
    const ne = e.nativeEvent as unknown as {
      touches?: { pageX?: number; pageY?: number; clientX?: number; clientY?: number }[];
      pageX?: number;
      pageY?: number;
      clientX?: number;
      clientY?: number;
      locationX?: number;
      locationY?: number;
    };
    const t = ne.touches;
    const getX = (obj?: { pageX?: number; clientX?: number }) =>
      obj?.pageX ?? obj?.clientX ?? ne.pageX ?? ne.clientX ?? ne.locationX ?? 0;
    const getY = (obj?: { pageY?: number; clientY?: number }) =>
      obj?.pageY ?? obj?.clientY ?? ne.pageY ?? ne.clientY ?? ne.locationY ?? 0;

    if (!t || t.length === 0) {
      return { n: 1, mx: getX(), my: getY(), dist: 0 };
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
      };
    }
    return { n: 1, mx: getX(t[0]), my: getY(t[0]), dist: 0 };
  };

  const containerOffset = useRef({ x: 0, y: 0 });
  const measure = useCallback(() => {
    containerRef.current?.measureInWindow?.((x: number, y: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        containerOffset.current = { x, y };
      }
    });
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: (_e, gs) =>
          Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e, gs) => {
          cancelAnim();
          const r = readTouches(e);
          gesture.current = {
            touches: r.n,
            midX: r.mx,
            midY: r.my,
            dist: r.dist,
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
            v = { ...v, ...zoomAround(Math.log2(r.dist / g.dist), fx, fy, v) };
            const s = Math.pow(2, v.zoom);
            apply({ ...v, cx: v.cx - (r.mx - g.midX) / s, cy: v.cy - (r.my - g.midY) / s });
          } else {
            const ddx = gs.dx - g.prevDx;
            const ddy = gs.dy - g.prevDy;
            const s = Math.pow(2, v.zoom);
            apply({ ...v, cx: v.cx - ddx / s, cy: v.cy - ddy / s });
          }
          gesture.current = {
            touches: r.n,
            midX: r.mx,
            midY: r.my,
            dist: r.dist,
            prevDx: gs.dx,
            prevDy: gs.dy,
          };
        },
      }),
    [apply, cancelAnim, zoomAround],
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
      const x = size.w / 2 + (w.x - view.cx) * scale;
      const y = size.h / 2 + (w.y - view.cy) * scale;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return { x: -9999, y: -9999 };
      }
      return { x, y };
    },
    [size.w, size.h, view.cx, view.cy, scale],
  );

  const tiles = useMemo(() => {
    if (!size.w) return [];
    const tz = Math.min(18, Math.max(0, Math.round(view.zoom)));
    const k = Math.pow(2, view.zoom - tz);
    const ts = TILE * k;
    const ctx = view.cx * Math.pow(2, tz);
    const cty = view.cy * Math.pow(2, tz);
    const minX = Math.floor((ctx - size.w / 2 / k) / TILE);
    const maxX = Math.floor((ctx + size.w / 2 / k) / TILE);
    const minY = Math.floor((cty - size.h / 2 / k) / TILE);
    const maxY = Math.floor((cty + size.h / 2 / k) / TILE);
    const max = Math.pow(2, tz);
    const out: { key: string; url: string; left: number; top: number; size: number }[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (x < 0 || y < 0 || x >= max || y >= max) continue;
        const url = TILE_URL.replace('{z}', String(tz))
          .replace('{x}', String(x))
          .replace('{y}', String(y));
        out.push({
          key: `${tz}/${x}/${y}`,
          url,
          left: size.w / 2 + (x * TILE - ctx) * k,
          top: size.h / 2 + (y * TILE - cty) * k,
          size: ts,
        });
      }
    }
    return out;
  }, [view.cx, view.cy, view.zoom, size.w, size.h]);

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

  /* ----- Heat layer (vibrant thermal gradient with deep red peak) ----- */
  const heat = useMemo(() => {
    if (!showHeat || !size.w || events.length === 0) return [];
    return events
      .map((ev) => {
        const n = interestedCount(ev);
        const pt = toScreen(ev);
        const meters = 260 + n * 1.25;
        const r = clamp(meters / metersPerPixel(ev.lat, view.zoom), 42, 215);
        const intensity = clamp(n / 320, 0.25, 1);
        const o = clamp(0.58 + intensity * 0.38, 0.62, 0.96);
        return { id: ev.id, x: pt.x, y: pt.y, r, o, hot: n >= 140 };
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

      {/* Rzeczywisty podkład OpenStreetMap */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {tiles.map((t) => (
          <View
            key={t.key}
            style={[styles.tile, { left: t.left, top: t.top, width: t.size + 0.6, height: t.size + 0.6 }]}
          >
            <Image
              source={{ uri: t.url }}
              style={StyleSheet.absoluteFill}
              onLoad={() => setTilesLoaded((n) => n + 1)}
              fadeDuration={0}
            />
          </View>
        ))}
      </View>
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>

      {/* Warstwa aktywności + odcinki ulic / linii komunikacji */}
      {size.w > 0 && (showHeat || screenPolylines.length > 0) ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size.w} height={size.h}>
            <Defs>
              <RadialGradient id="heat" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#dc000086" stopOpacity="0.95" />
                <Stop offset="28%" stopColor="#ff2f00a7" stopOpacity="0.82" />
                <Stop offset="58%" stopColor="#ff7b009a" stopOpacity="0.55" />
                <Stop offset="82%" stopColor="#ffd000a1" stopOpacity="0.28" />
                <Stop offset="100%" stopColor="#ffe6006f" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="heatCore" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#b900007a" stopOpacity="0.95" />
                <Stop offset="55%" stopColor="#ff11007a" stopOpacity="0.65" />
                <Stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {showHeat
              ? heat.map((h) => (
                  <React.Fragment key={h.id}>
                    <Circle cx={h.x} cy={h.y} r={h.r} fill="url(#heat)" opacity={h.o} />
                    {h.hot ? (
                      <Circle
                        cx={h.x}
                        cy={h.y}
                        r={h.r * 0.52}
                        fill="url(#heatCore)"
                        opacity={0.9}
                      />
                    ) : null}
                  </React.Fragment>
                ))
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
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {screenPolylines.map((pl) => {
          if (!pl.label || pl.faint) return null;
          return (
            <Pressable
              key={`lbl-${pl.id}`}
              onPress={() => onSelect(pl.selected ? null : pl.id)}
              style={[
                styles.segmentLabel,
                {
                  left: pl.mid.x - 48,
                  top: pl.mid.y - 28,
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
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {stops.map((s) => {
          const pt = toScreen(s);
          if (pt.x < -60 || pt.y < -60 || pt.x > size.w + 60 || pt.y > size.h + 60) return null;
          const selected = s.id === selectedId;
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelect(selected ? null : s.id)}
              style={[
                styles.stopHit,
                { left: pt.x - 14, top: pt.y - 14, zIndex: selected ? 55 : 3 },
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
                <Ionicons name="bus" size={11} color={selected ? '#FFFFFF' : colors.river} />
              </View>
            </Pressable>
          );
        })}

        {clusters.map((c) => (
          <Pressable
            key={`cl-${c.key}`}
            onPress={() => {
              const target = unproject(
                (viewRef.current.cx + (c.x - size.w / 2) / scale) * Math.pow(2, 0),
                (viewRef.current.cy + (c.y - size.h / 2) / scale) * Math.pow(2, 0),
                0,
              );
              animateTo(viewFor(target, Math.min(MAX_ZOOM, view.zoom + 1.5)));
            }}
            style={[styles.clusterHit, { left: c.x - 21, top: c.y - 21 }]}
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
              onPress={() => onSelect(selected ? null : event.id)}
              style={[
                styles.markerHit,
                { left: x - 20, top: y - 42, zIndex: selected ? 50 : 2 },
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
                <Ionicons name={meta.icon as never} size={15} color="#fff" />
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
              onPress={() => onSelect(selected ? null : m.id)}
              style={[
                styles.markerHit,
                { left: pt.x - 20, top: pt.y - 20, zIndex: selected ? 60 : 5 },
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
                <Ionicons name={m.icon} size={15} color="#fff" />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Przyciski sterowania mapą */}
      {hideControls ? null : (
        <View style={[styles.controls, { bottom: bottomInset + spacing.sm }]} pointerEvents="box-none">
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
            onPress={() => animateTo(viewFor(TORUN_CENTER, DEFAULT_ZOOM))}
          />
          <MapButton icon="add" label="Przybliż" onPress={() => zoomBy(1)} />
          <MapButton icon="remove" label="Oddal" onPress={() => zoomBy(-1)} />
        </View>
      )}
    </View>
  );
});

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
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.mapBtn,
        active && { backgroundColor: colors.brick, borderColor: colors.brick },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? '#fff' : colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF1F5', overflow: 'hidden' },
  tile: {
    position: 'absolute',
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
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.river,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  markerHit: { position: 'absolute', width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  markerLabel: {
    position: 'absolute',
    top: -26,
    maxWidth: 200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignSelf: 'center',
  },
  markerLabelText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  clusterHit: { position: 'absolute', width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cluster: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.river,
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  clusterText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  segmentLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    ...shadow.card,
  },
  segmentDot: { width: 6, height: 6, borderRadius: 3 },
  segmentLabelText: { fontSize: 11, fontWeight: '700' },
  controls: { position: 'absolute', right: spacing.md, gap: 6 },
  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
