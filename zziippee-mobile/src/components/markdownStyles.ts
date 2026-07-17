import { useColorScheme } from 'react-native';
import { spacing, type Palette, continuousCurve } from '../theme/tokens';

/** Returns the markdown style object for question content — code blocks, tables, inline code. */
export function questionMarkdownStyle(isDark: boolean): Record<string, any> {
  return {
    body: { color: isDark ? '#e5e7eb' : '#1f2937', fontSize: 16, lineHeight: 24 } as any,
    heading1: { color: isDark ? '#f9fafb' : '#111827', fontSize: 24, fontWeight: '800', marginTop: spacing.lg } as any,
    heading2: { color: isDark ? '#f9fafb' : '#111827', fontSize: 20, fontWeight: '700', marginTop: spacing.md } as any,
    strong: { fontWeight: '800', color: isDark ? '#f9fafb' : '#111827' } as any,
    em: { fontStyle: 'italic', color: isDark ? '#d1d5db' : '#374151' } as any,
    // Deliberately not red/green — those are reserved for the right/wrong answer feedback state.
    code_inline: { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#7c7aff' : '#5856d6', fontFamily: 'Courier', borderRadius: 4, paddingHorizontal: 4 } as any,
    bullet_list: { marginTop: spacing.sm } as any,
  };
}
