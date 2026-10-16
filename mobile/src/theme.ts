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

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = {
  h1: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 17 },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.1 },
};

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  float: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
};

export const TOUCH = 40;
