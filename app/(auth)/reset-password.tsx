import { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { PressableScale } from '../../src/components/PressableScale';
import { useResetPassword } from '../../src/api/hooks/auth';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../src/theme/tokens';

export default function ResetPasswordScreen() {
  const t = useTheme();
  const router = useRouter();
  const reset = useResetPassword();
  const { email: paramEmail, token: paramToken } = useLocalSearchParams<{ email?: string; token?: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Deep link missing required params — show invalid-link state.
  if (!paramEmail || !paramToken) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.container}>
            <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.red }, continuousCurve, shadow.card]}>
              <Icon name="lock" size={28} color="#fff" />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Text variant="title1" style={styles.h1}>Invalid link</Text>
              <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
                This password reset link is invalid or has expired. Please request a new one.
              </Text>
            </Animated.View>

            <PressableScale
              style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]}
              onPress={() => router.replace('/(auth)/login')}
              accessibilityLabel="Back to login button"
            >
              <Text variant="headline" color="blue">Back to login</Text>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const email = paramEmail;
  const token = paramToken;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.blue }, continuousCurve, shadow.card]}>
            <Icon name="shield" size={28} color="#fff" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <Text variant="title1" style={styles.h1}>Set new password</Text>
            <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
              Enter a new password for {email}. Must be at least 12 characters.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="New password" placeholderTextColor={t.label3}
              secureTextEntry value={password} onChangeText={setPassword}
              accessibilityLabel="New password input field"
              accessibilityHint="Enter your new password"
            />
            <View style={[styles.sep, { backgroundColor: t.separator }]} />
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Confirm password" placeholderTextColor={t.label3}
              secureTextEntry value={confirm} onChangeText={setConfirm}
              accessibilityLabel="Confirm password input field"
              accessibilityHint="Re-enter your new password to confirm it matches"
            />
          </Animated.View>

          {reset.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{reset.error.message}</Text>}

          <PressableScale
            style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
            onPress={() => {
              if (password.length < 12) {
                Alert.alert('Password too short', 'Your password must be at least 12 characters.');
                return;
              }
              if (password !== confirm) {
                Alert.alert('Passwords do not match', 'Please re-enter your new password to confirm it matches.');
                return;
              }
              reset.mutate(
                { email, token, password, password_confirmation: confirm },
                { onSuccess: () => router.replace('/(auth)/login') },
              );
            }}
            disabled={reset.isPending || !password || !confirm}
            accessibilityLabel="Reset password button"
          >
            {reset.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Reset password</Text>}
          </PressableScale>

          <PressableScale style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]} onPress={() => router.back()} accessibilityLabel="Back to login button">
            <Text variant="headline" color="blue">Back to login</Text>
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
  btnGhost: { marginTop: spacing.md, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center', borderWidth: hairline },
});
