import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { ReactNode } from 'react';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  progress: number; // 0–1
  size?: number;
  strokeWidth?: number;
  color: string;
  track: string;
  children?: ReactNode;
  style?: ViewStyle;
}

/**
 * The app's one recurring motif: adaptive mastery/progress as a ring, not a bare
 * number. Used small (ambient, in the quiz nav) and large (the payoff, in review).
 */
export function ProgressRing({ progress, size = 44, strokeWidth = 4, color, track, children, style }: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
