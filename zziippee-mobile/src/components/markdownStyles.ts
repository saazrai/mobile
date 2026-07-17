import { useColorScheme } from 'react-native';
import { spacing, radius, type Palette, continuousCurve } from '../theme/tokens';

/** Returns the markdown style object for question content — code blocks, tables, inline code. */
export function questionMarkdownStyle(isDark: boolean): Record<string, any> {
  return {
    body: { color: isDark ? '#e5e7eb' : '#1f2937', fontSize: 16, lineHeight: 24 } as any,
    heading1: { color: isDark ? '#f9fafb' : '#111827', fontSize: 24, fontWeight: '800', marginTop: spacing.lg } as any,
    heading2: { color: isDark ? '#f9fafb' : '#111827', fontSize: 20, fontWeight: '700', marginTop: spacing.md } as any,
    strong: { fontWeight: '800', color: isDark ? '#f9fafb' : '#111827' } as any,
    em: { fontStyle: 'italic', color: isDark ? '#d1d5db' : '#374151' } as any,
    code_inline: { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#fbbf24' : '#dc2626', fontFamily: 'Courier', borderRadius: 4, paddingHorizontal: 4 } as any,
    pre: { backgroundColor: isDark ? '#111827' : '#f8fafc', borderColor: isDark ? '#374151' : '#e2e8f0', borderWidth: 1, borderRadius: radius.card, padding: spacing.md, marginVertical: spacing.sm } as any,
    pre_code: { backgroundColor: 'transparent', color: isDark ? '#e5e7eb' : '#1e293b', fontFamily: 'Courier', fontSize: 13, lineHeight: 18, whiteSpace: 'pre' } as any,
    table: { borderWidth: 0, borderColor: 'transparent', overflow: 'visible' } as any,
    th: { backgroundColor: isDark ? '#1f2937' : '#f1f5f9', color: isDark ? '#f3f4f6' : '#111827', fontWeight: '700', borderColor: isDark ? '#374151' : '#e2e8f0', borderWidth: 1, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm } as any,
    td: { color: isDark ? '#d1d5db' : '#374151', borderColor: isDark ? '#374151' : '#e2e8f0', borderWidth: 1, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm } as any,
    bullet_list: { marginTop: spacing.sm } as any,
  };
}
