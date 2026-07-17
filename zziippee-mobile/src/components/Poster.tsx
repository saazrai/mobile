import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Apple-TV-style cinematic poster: a duotone gradient "artwork" with a vignette
 * veil so overlaid white text stays legible. Placeholder for real course art
 * (swap for <expo-image> later). Presets mirror the mockup's art-* classes.
 */
const ART: Record<string, [string, string, string]> = {
  security: ['#1f3fae', '#0b1f5e', '#071233'],
  cc: ['#0e8f7e', '#0a5a63', '#05242c'],
  exam: ['#5b3fd6', '#3a1f8f', '#1a0f45'],
  cysa: ['#c2410c', '#7c2d12', '#2b0705'],
};

export function Poster({
  art = 'security',
  children,
  style,
  veil = true,
}: {
  art?: keyof typeof ART;
  children?: ReactNode;
  style?: ViewStyle;
  veil?: boolean;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient colors={ART[art]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      {veil && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', justifyContent: 'flex-end' },
});
