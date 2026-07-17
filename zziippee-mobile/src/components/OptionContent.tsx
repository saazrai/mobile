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
    body: { color: isDark ? '#e5e7eb' : '#1f2937', fontSize: 16, lineHeight: 24 } as any,
    // Same color/background as plain option text — some options (e.g. whole shell
    // functions) are wrapped entirely in a code span, so a distinct chip style here
    // (unlike inline code inside a normal sentence) reads as one option being
    // singled out rather than "this text is code." Monospace is the only marker.
    code_inline: { backgroundColor: 'transparent', color: isDark ? '#e5e7eb' : '#1f2937', fontFamily: 'Courier', paddingHorizontal: 0 } as any,
    strong: { fontWeight: '800', color: isDark ? '#f9fafb' : '#111827' } as any,
    em: { fontStyle: 'italic', color: isDark ? '#d1d5db' : '#374151' } as any,
  };
}
