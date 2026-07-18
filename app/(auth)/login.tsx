import { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { PressableScale } from '../../src/components/PressableScale';
import { useLogin, useGoogleSignIn } from '../../src/api/hooks/auth';

/**
 * Google Sign-In is only available in dev clients / prebuilds where the native
 * RNGoogleSignin bridge is linked. In Expo Go we hide the button rather than
 * crash with "RNGoogleSignin could not be found".
 */
let GoogleSignin: any;
let statusCodes: { SIGN_IN_CANCELLED: string };
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin ?? mod.default?.GoogleSignin;
  statusCodes = (mod as any).statusCodes ?? {};
} catch {
  // native module not linked — button will be hidden
}
const googleAvailable = !!GoogleSignin;
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../src/theme/tokens';

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const login = useLogin();
  const googleSignIn = useGoogleSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.blue }, continuousCurve, shadow.card]}>
            <Icon name="shield" size={30} color="#fff" />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(120).duration(400)}>
            <Text variant="title1" style={styles.h1}>Welcome back</Text>
            <Text variant="subhead" color="label2" style={{ marginTop: 4, textAlign: 'center' }}>Sign in to keep your streak going</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Email" placeholderTextColor={t.label3}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
            />
            <View style={[styles.sep, { backgroundColor: t.separator }]} />
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Password" placeholderTextColor={t.label3}
              secureTextEntry value={password} onChangeText={setPassword}
            />
          </Animated.View>

          {login.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{login.error.message}</Text>}

          <PressableScale
            style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
            onPress={() => login.mutate({ email, password })}
            disabled={login.isPending || googleSignIn.isPending}
          >
            {login.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Sign in</Text>}
          </PressableScale>

          {googleAvailable && (
            <PressableScale
              style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]}
              onPress={async () => {
                try {
                  await GoogleSignin.hasPlayServices();
                  const res = await GoogleSignin.signIn();
                  if (res.type !== 'success') return; // cancelled / no saved credential
                  if (!res.data.idToken) { Alert.alert('Google Sign-In', 'No ID token received. Check webClientId config.'); return; }
                  googleSignIn.mutate(res.data.idToken);
                } catch (e: any) {
                  if (e.code === statusCodes.SIGN_IN_CANCELLED) return; // user tapped back / dismissed
                  Alert.alert('Google Sign-In failed', e.message ?? 'Try again.');
                }
              }}
              disabled={login.isPending || googleSignIn.isPending}
            >
              <>
                <Icon name="shareForward" size={16} color={t.blue} />
                <Text variant="headline" color="blue" style={{ marginLeft: spacing.sm }}>Continue with Google</Text>
              </>
            </PressableScale>
          )}

          <View style={styles.footRow}>
            <Text variant="subhead" color="label2">New here? </Text>
            <PressableScale onPress={() => router.push('/(auth)/register')}>
              <Text variant="subhead" color="blue">Create account</Text>
            </PressableScale>
          </View>

          <PressableScale style={[styles.linkBtn, { marginTop: spacing.sm }]} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text variant="footnote" color="blue">Forgot password?</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  logo: { width: 60, height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  h1: { textAlign: 'center' },
  card: { borderRadius: radius.cell, marginTop: spacing.xxl, overflow: 'hidden' },
  field: { paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 17 },
  sep: { height: hairline, marginLeft: spacing.lg },
  btn: { marginTop: spacing.lg, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
  btnGhost: { marginTop: spacing.md, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center', borderWidth: hairline, flexDirection: 'row', justifyContent: 'center' },
  linkBtn: { alignSelf: 'center' },
  footRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
