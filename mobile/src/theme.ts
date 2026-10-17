/**
 * Minimalistyczna, łagodna paleta kolorystyczna inspirowana Toruniem:
 * jasne, spokojne tło, stonowana ceglana terakota oraz przygaszony błękit Wisły.
 */
export const colors = {
  brick: '#C2594A',
  brickDark: '#9E4235',
  brickSoft: '#F9ECE9',
  river: '#3B6990',
  riverSoft: '#EBF2F7',
  ginger: '#C4842D',
  gingerSoft: '#FBF3E4',
  cream: '#F6F7F9',
  surface: '#FFFFFF',
  ink: '#1F2937',
  inkSoft: '#4B5563',
  muted: '#8A94A6',
  line: '#E6E9EF',
  success: '#2E855A',
  successSoft: '#E8F5EE',
  warning: '#B87514',
  warningSoft: '#FDF3E1',
  danger: '#C94A4A',
  dangerSoft: '#FCECEC',
  info: '#3B6990',
  infoSoft: '#EBF2F7',
  overlay: 'rgba(15, 23, 42, 0.38)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

export const font = {
  hero: { fontSize: 26, fontWeight: '900' as const, letterSpacing: -0.8 },
  h1: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 15, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 19 },
  small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.1 },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export const TOUCH = 40;
