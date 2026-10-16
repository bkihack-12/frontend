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
import type { CityEvent, MapPoint } from '../types';
import { CATEGORY_META } from '../data/events';
import { DEMO_USER_LOCATION, LatLng, TORUN_CENTER, metersPerPixel, project, unproject } from '../lib/geo';
import { colors, font, radius, shadow, spacing, TOUCH } from '../theme';

/**
 * Jasne, stonowane kafelki CARTO Positron + wbudowany wektorowy podkład Torunia (Wisła, mosty,
 * główne arterie i dzielnice), dzięki czemu mapa jest zawsze czytelna (również offline).
 */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const SUBDOMAINS = ['a', 'b', 'c', 'd'];
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

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function clampView(v: View_): View_ {
  const tl = project({ lat: BOUNDS.maxLat, lng: BOUNDS.minLng }, 0);
  const br = project({ lat: BOUNDS.minLat, lng: BOUNDS.maxLng }, 0);
  return {
    zoom: clamp(v.zoom, MIN_ZOOM, MAX_ZOOM),
    cx: clamp(v.cx, tl.x, br.x),
    cy: clamp(v.cy, tl.y, br.y),
  };
}

function viewFor(center: LatLng, zoom: number): View_ {
  const p = project(center, 0);
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
    const wx = v.cx + fx / s1;
    const wy = v.cy + fy / s1;
    return { cx: wx - fx / s2, cy: wy - fy / s2, zoom: z2 };
  }, []);

  const gesture = useRef({ touches: 0, midX: 0, midY: 0, dist: 0 });

  const readTouches = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    if (!t || t.length === 0) {
      return { n: 1, mx: e.nativeEvent.pageX, my: e.nativeEvent.pageY, dist: 0 };
    }
    if (t.length >= 2) {
      const a = t[0];
      const b = t[1];
      return {
        n: 2,
        mx: (a.pageX + b.pageX) / 2,
        my: (a.pageY + b.pageY) / 2,
        dist: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
      };
    }
    return { n: 1, mx: t[0].pageX, my: t[0].pageY, dist: 0 };
  };

  const containerOffset = useRef({ x: 0, y: 0 });
  const measure = useCallback(() => {
    containerRef.current?.measureInWindow?.((x: number, y: number) => {
      containerOffset.current = { x, y };
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
        onPanResponderGrant: (e) => {
          cancelAnim();
          const r = readTouches(e);
          gesture.current = { touches: r.n, midX: r.mx, midY: r.my, dist: r.dist };
        },
        onPanResponderMove: (e) => {
          const r = readTouches(e);
          const g = gesture.current;
          if (r.n !== g.touches) {
            gesture.current = { touches: r.n, midX: r.mx, midY: r.my, dist: r.dist };
            return;
          }
          let v = viewRef.current;
          if (r.n === 2 && g.dist > 0 && r.dist > 0) {
            const { w, h } = sizeRef.current;
            const fx = r.mx - (containerOffset.current.x + w / 2);
            const fy = r.my - (containerOffset.current.y + h / 2);
            v = { ...v, ...zoomAround(Math.log2(r.dist / g.dist), fx, fy, v) };
          }
          const s = Math.pow(2, v.zoom);
          apply({ ...v, cx: v.cx - (r.mx - g.midX) / s, cy: v.cy - (r.my - g.midY) / s });
          gesture.current = { touches: r.n, midX: r.mx, midY: r.my, dist: r.dist };
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
      const w = project(p, 0);
      return {
        x: size.w / 2 + (w.x - view.cx) * scale,
        y: size.h / 2 + (w.y - view.cy) * scale,
      };
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
        const url = TILE_URL.replace('{s}', SUBDOMAINS[(x + y) % SUBDOMAINS.length])
          .replace('{z}', String(tz))
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

  /* ----- Heat layer ----- */
  const heat = useMemo(() => {
    if (!showHeat || !size.w || events.length === 0) return [];
    return events.map((ev) => {
      const n = interestedCount(ev);
      const pt = toScreen(ev);
      const meters = 200 + n * 0.95;
      const r = clamp(meters / metersPerPixel(ev.lat, view.zoom), 30, 180);
      return { id: ev.id, x: pt.x, y: pt.y, r, o: clamp(0.22 + n / 750, 0.24, 0.65) };
    });
  }, [events, showHeat, toScreen, size.w, view.zoom, interestedCount]);

  /* ----- Screen-projected polylines (traffic jams / transit routes) ----- */
  const screenPolylines = useMemo(() => {
    if (!size.w || polylines.length === 0) return [];
    return polylines.map((pl) => {
      const pts = pl.path.map(toScreen);
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
    });
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

      {/* Kafelki rastrowe CARTO Positron */}
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

      {/* Warstwa aktywności + odcinki ulic / linii komunikacji */}
      {size.w > 0 && (showHeat || screenPolylines.length > 0) ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={size.w} height={size.h}>
            <Defs>
              <RadialGradient id="heat" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#D96B52" stopOpacity="0.65" />
                <Stop offset="0.45" stopColor="#E99B58" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#F4C77B" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {showHeat
              ? heat.map((h) => (
                  <Circle key={h.id} cx={h.x} cy={h.y} r={h.r} fill="url(#heat)" opacity={h.o} />
                ))
              : null}
            {screenPolylines.map((pl) => {
              const strokeW = pl.faint ? 4 : pl.selected ? 9 : 6;
              return (
                <React.Fragment key={pl.id}>
                  {/* Obrys (casing) dla czytelności */}
                  {!pl.faint ? (
                    <Polyline
                      points={pl.pointsAttr}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={strokeW + 4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.95}
                    />
                  ) : null}
                  <Polyline
                    points={pl.pointsAttr}
                    fill="none"
                    stroke={pl.color}
                    strokeWidth={strokeW}
                    strokeDasharray={pl.dashed ? '8, 6' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={pl.faint ? 0.42 : 0.95}
                  />
                  {/* Punkty końcowe odcinka */}
                  {!pl.faint && pl.pts.length >= 2 ? (
                    <>
                      <Circle
                        cx={pl.pts[0].x}
                        cy={pl.pts[0].y}
                        r={4.5}
                        fill="#FFFFFF"
                        stroke={pl.color}
                        strokeWidth={2.5}
                      />
                      <Circle
                        cx={pl.pts[pl.pts.length - 1].x}
                        cy={pl.pts[pl.pts.length - 1].y}
                        r={4.5}
                        fill="#FFFFFF"
                        stroke={pl.color}
                        strokeWidth={2.5}
                      />
                    </>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      ) : null}

      {/* Etykiety długości zapchanych ulic / odcinków linii na mapie */}
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
                  left: pl.mid.x - 42,
                  top: pl.mid.y - 26,
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

      {/* Znaczniki wydarzeń (Społeczność) oraz punktów (Ruch / Transport) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
  markerHit: { position: 'absolute', width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  markerLabel: {
    position: 'absolute',
    top: -26,
    maxWidth: 180,
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
