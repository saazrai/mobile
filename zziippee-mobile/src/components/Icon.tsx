import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

export type IconName =
  | 'home' | 'cards' | 'chart' | 'person' | 'play' | 'book' | 'layers'
  | 'video' | 'brain' | 'shield' | 'clock' | 'bell' | 'lock' | 'x' | 'check' | 'chevron';

interface Props { name: IconName; size?: number; color?: string; filled?: boolean }

/**
 * SF-Symbols-style line icons (react-native-svg). Mirrors the sprite in
 * design/uiux-mockup.html so app and mockup share one visual vocabulary.
 */
export function Icon({ name, size = 24, color = '#000', filled = false }: Props) {
  const stroke = color;
  const sw = 1.9;
  const common = { stroke, strokeWidth: sw, fill: filled ? color : 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" {...common} fill="none" />}
      {name === 'cards' && <G><Rect x={3} y={6} width={18} height={13} rx={2.5} {...common} /><Path d="M7 3h10" {...common} /></G>}
      {name === 'chart' && <Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...common} fill="none" />}
      {name === 'person' && <G><Circle cx={12} cy={8} r={4} {...common} /><Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" {...common} fill="none" /></G>}
      {name === 'play' && <Path d="M7 4.5v15l13-7.5z" fill={color} stroke="none" />}
      {name === 'book' && <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H20" {...common} fill="none" />}
      {name === 'layers' && <Path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5" {...common} fill="none" />}
      {name === 'video' && <G><Rect x={3} y={6} width={13} height={12} rx={2.5} {...common} /><Path d="m16 10 5-3v10l-5-3" {...common} fill="none" /></G>}
      {name === 'brain' && <Path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 5 2.5 2.5 0 0 0 5 .3V4.2A2.2 2.2 0 0 0 9 4Z" {...common} fill="none" />}
      {name === 'shield' && <G><Path d="M12 3 5 5.5V11c0 4.5 3 7.5 7 9.5 4-2 7-5 7-9.5V5.5z" {...common} fill="none" /><Path d="m9 11 2 2 4-4" {...common} fill="none" /></G>}
      {name === 'clock' && <G><Circle cx={12} cy={12} r={9} {...common} /><Path d="M12 7v5l3 2" {...common} fill="none" /></G>}
      {name === 'bell' && <G><Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...common} fill="none" /><Path d="M10 20a2 2 0 0 0 4 0" {...common} /></G>}
      {name === 'lock' && <G><Rect x={5} y={10} width={14} height={10} rx={2.5} {...common} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} fill="none" /></G>}
      {name === 'x' && <Path d="M6 6 18 18M18 6 6 18" {...common} />}
      {name === 'check' && <Path d="M5 12.5 10 17.5 19 7" {...common} fill="none" />}
      {name === 'chevron' && <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
}
