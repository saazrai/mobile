import Markdown from 'react-native-markdown-display';
import { useColorScheme } from 'react-native';

interface OptionContentProps {
  children: string;
}

/** Renders option text as Markdown — handles inline code, bold, lists. */
export function OptionContent({ children }: OptionContentProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return (
    <Markdown style={optionStyle(isDark)}>
      {children}
    </Markdown>
  );
}

function optionStyle(isDark: boolean) {
  return {
    body: { color: isDark ? '#e5e7eb' : '#1f2937', fontSize: 14, lineHeight: 20 } as any,
    code_inline: { backgroundColor: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#fbbf24' : '#dc2626', fontFamily: 'Courier', borderRadius: 4, paddingHorizontal: 4 } as any,
    strong: { fontWeight: '800', color: isDark ? '#f9fafb' : '#111827' } as any,
    em: { fontStyle: 'italic', color: isDark ? '#d1d5db' : '#374151' } as any,
  };
}
