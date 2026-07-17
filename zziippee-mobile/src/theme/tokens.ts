import { useColorScheme, StyleSheet } from 'react-native';

/**
 * iOS semantic design tokens (mirrors design/uiux-mockup.html). Names follow
 * Apple's UIKit semantics so screens read like the platform: systemGroupedBackground,
 * secondary/tertiaryLabel, separator, system colors, and blur materials.
 */
const light = {
  sysBg: '#f2f2f7', // systemGroupedBackground (screen)
  cell: '#ffffff', // secondarySystemGroupedBackground (rows/cards)
  cellPress: '#d9d9de',
  label: '#000000',
  label2: 'rgba(60,60,67,0.60)', // secondaryLabel
  label3: 'rgba(60,60,67,0.30)', // tertiaryLabel / chevron
  separator: 'rgba(60,60,67,0.29)',
  blue: '#007aff',
  green: '#34c759',
  red: '#ff3b30',
  orange: '#ff9500',
  indigo: '#5856d6',
  fill: 'rgba(120,120,128,0.12)',
  material: 'rgba(249,249,252,0.72)', // nav/tab blur overlay tint
  onColor: '#ffffff',
};

const dark: typeof light = {
  sysBg: '#000000',
  cell: '#1c1c1e',
  cellPress: '#2c2c2e',
  label: '#ffffff',
  label2: 'rgba(235,235,245,0.60)',
  label3: 'rgba(235,235,245,0.30)',
  separator: 'rgba(84,84,88,0.65)',
  blue: '#0a84ff',
  green: '#30d158',
  red: '#ff453a',
  orange: '#ff9f0a',
  indigo: '#5e5ce6',
  fill: 'rgba(120,120,128,0.24)',
  material: 'rgba(30,30,32,0.72)',
  onColor: '#ffffff',
};

export type Palette = typeof light;

/** SF Pro type ramp — Apple's text styles (size / weight / tracking in pt). */
export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.4, lineHeight: 41 },
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.2, lineHeight: 22 },
  callout: { fontSize: 16, fontWeight: '400', letterSpacing: -0.2, lineHeight: 21 },
  subhead: { fontSize: 15, fontWeight: '400', letterSpacing: -0.1, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: 0, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', letterSpacing: 0, lineHeight: 16 },
} as const;

export const radius = { cell: 11, card: 18, control: 12, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const hairline = StyleSheet.hairlineWidth;
/** Grouped-list inset for separators that clear a leading icon. */
export const listInset = { plain: spacing.lg, withIcon: 52 };
/** True iOS squircle — a continuous corner curve, not a circular radius. iOS-only; Android ignores it. */
export const continuousCurve = { borderCurve: 'continuous' as const };
/** Elevation presets (matches the depth already used on flashcards/posters) — resting card vs. floating chrome. */
export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  floating: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
