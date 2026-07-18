import { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { PressableScale } from '../../src/components/PressableScale';
import { useForgotPassword } from '../../src/api/hooks/auth';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../src/theme/tokens';

export default function ForgotPasswordScreen() {
  const t = useTheme();
  const router = useRouter();
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.blue }, continuousCurve, shadow.card]}>
            <Icon name="shield" size={28} color="#fff" />
          </Animated.View>

          {!sent ? (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text variant="title1" style={styles.h1}>Reset password</Text>
                <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
                <TextInput
                  style={[styles.field, { color: t.label }]}
                  placeholder="Email" placeholderTextColor={t.label3}
                  autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
                  accessibilityLabel="Email input field for password reset"
                  accessibilityHint="Enter your email address to receive a password reset link"
                />
              </Animated.View>

              {forgot.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{forgot.error.message}</Text>}

              <PressableScale
                style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
                onPress={() => {
                  forgot.mutate(
                    { email },
                    { onSuccess: () => setSent(true) },
                  );
                }}
                disabled={forgot.isPending || !email}
                accessibilityLabel="Send password reset link button"
              >
                {forgot.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Send reset link</Text>}
              </PressableScale>

              <PressableScale style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]} onPress={() => router.back()} accessibilityLabel="Back to login button">
                <Text variant="headline" color="blue">Back to login</Text>
              </PressableScale>
            </>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text variant="title1" style={styles.h1}>Check your email</Text>
                <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
                  We sent a password reset link to {email}. Check your inbox and follow the instructions.
                </Text>
              </Animated.View>

              <PressableScale style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]} onPress={() => router.back()} accessibilityLabel="Back to login button">
                <Text variant="headline" color="blue">Back to login</Text>
              </PressableScale>
            </>
          )}
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
  btn: { marginTop: spacing.lg, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
  btnGhost: { marginTop: spacing.md, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center', borderWidth: hairline },
});
