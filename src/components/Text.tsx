import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { type as ramp, useTheme, type Palette } from '../theme/tokens';

type Variant = keyof typeof ramp;
type ColorKey = 'label' | 'label2' | 'label3' | 'blue' | 'red' | 'green' | 'onColor';

interface Props extends TextProps {
  variant?: Variant;
  color?: ColorKey;
}

/**
 * Typography primitive keyed to the SF Pro ramp (tokens.ts). Use this instead of
 * bare <Text> so every screen inherits Apple's type scale and semantic colors.
 *   <Text variant="largeTitle">Study</Text>
 *   <Text variant="footnote" color="label2">…</Text>
 */
export function Text({ variant = 'body', color = 'label', style, ...rest }: Props) {
  const t = useTheme();
  return <RNText {...rest} style={[ramp[variant] as TextStyle, { color: t[color as keyof Palette] as string }, style]} />;
}
