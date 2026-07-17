import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

export type IconName =
    | 'home' | 'cards' | 'chart' | 'person' | 'play' | 'book' | 'layers'
    | 'video' | 'brain' | 'shield' | 'clock' | 'bell' | 'lock' | 'x' | 'check' | 'chevron'
    | 'moreHorizontal' | 'bookmark' | 'shareForward' | 'paperPlane' | 'link'
    | 'userPlus' | 'mute' | 'flag' | 'trash' | 'personPlus';

interface Props { name: IconName; size?: number; color?: string; filled?: boolean }

/**
 * SF-Symbols-style line icons (react-native-svg). Mirrors the sprite in
 * design/uiux-mockup.html so app and mockup share one visual vocabulary.
 */
export function Icon({ name, size = 24, color = '#000', filled = false }: Props) {
  const stroke = color;
  const sw = 1.9;
  const common = { stroke, strokeWidth: sw, fill: filled ? color : 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  // Paths with ambiguous numeric sequences ("0 0 0") are extracted here
  // so the JSX parser doesn't confuse them with object literals.
  const _brain = 'M12 3c-1.4 0 -2.6 0.9 -3.1 2.1c-1.3 0.3 -2.3 1.5 -2.2 2.9c0.1 0.5 0.2 0.9 0.4 1.3c-1 0.6 -1.6 1.7 -1.6 2.9c0 1.2 0.7 2.3 1.7 2.8c-0.1 0.4 -0.2 0.8 -0.1 1.3c0.1 1.4 1.3 2.5 2.7 2.5c0.5 0 1 -0.1 1.4 -0.4c0.4 0.7 1.1 1.1 1.9 1.1V3Z';

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
        {name === 'brain' && <G><Path d={_brain} {...common} fill="none" /><Path d={_brain} {...common} fill="none" transform="translate(24,0) scale(-1,1)" /></G>}
        {name === 'shield' && <G><Path d="M12 3 5 5.5V11c0 4.5 3 7.5 7 9.5 4-2 7-5 7-9.5V5.5z" {...common} fill="none" /><Path d="m9 11 2 2 4-4" {...common} fill="none" /></G>}
        {name === 'clock' && <G><Circle cx={12} cy={12} r={9} {...common} /><Path d="M12 7v5l3 2" {...common} fill="none" /></G>}
        {name === 'bell' && <G><Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...common} fill="none" /><Path d="M10 20a2 2 0 0 0 4 0" {...common} /></G>}
        {name === 'lock' && <G><Rect x={5} y={10} width={14} height={10} rx={2.5} {...common} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} fill="none" /></G>}
        {name === 'x' && <Path d="M6 6 18 18M18 6 6 18" {...common} />}
        {name === 'check' && <Path d="M5 12.5 10 17.5 19 7" {...common} fill="none" />}
        {name === 'chevron' && <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Floating menu icons — Instagram / iOS style */}
        {name === 'moreHorizontal' && <Path d="M6 12h.01M12 12h.01M18 12h.01" {...common} strokeWidth={sw + 0.5} />}
        {name === 'bookmark' && <Path d="M6 3h12a1 1 0 0 1 1 1v15l-7-4-7 4V4a1 1 0 0 1 1-1z" {...common} fill={filled ? color : 'none'} />}
        {name === 'shareForward' && <Path d="M4 4v16h16V4zM4 4l8 5M4 4l4 12" {...common} fill="none" />}
        {name === 'paperPlane' && <Path d="M22 3 9.5 20.13l-1.8-6.63 7.15-2.1L5.25 18.5 2 7.5l20-4.5z" {...common} fill={filled ? color : 'none'} />}
        {name === 'link' && <Path d="M9 13.5a3.5 3.5 0 0 1 5 0l2.5 2.5a3.5 3.5 0 0 1-5 0l-2.5-2.5zM15 10.5a3.5 3.5 0 0 1-5 0L7 8a3.5 3.5 0 0 1 5 0l2.5 2.5z" {...common} fill="none" />}
        {name === 'userPlus' && <G><Path d="M8 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" {...common} fill="none" /><Path d="M4 21v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1" {...common} fill="none" /><Path d="M16 12h4M18 10v4" {...common} fill="none" /></G>}
        {name === 'mute' && <G><Path d="M3 9v6h4l5 5V4L7 9H3z" {...common} fill="none" /><Path d="M16.5 9A4.5 4.5 0 0 1 19 12.5" {...common} fill="none" /><Path d="M19 12.5A4.5 4.5 0 0 1 16.5 16" {...common} fill="none" /><Path d="M22 9l-4 6" {...common} /></G>}
        {name === 'flag' && <Path d="M5 3v18M5 3h9l-2 4 2 4H5z" {...common} fill={filled ? color : 'none'} />}
        {name === 'trash' && <G><Path d="M4 7h16M9 7V4h6v3M10 7v10M14 7v10M6 7l1 11h10l1-11" {...common} fill="none" /></G>}
        {name === 'personPlus' && <G><Path d="M12 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" {...common} fill="none" /><Path d="M4 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" {...common} fill="none" /><Path d="M16 11h6M19 8v6" {...common} fill="none" /></G>}
      </Svg>
    );
}
