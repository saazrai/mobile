import { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { PressableScale } from '../../src/components/PressableScale';
import { useSendVerificationCode, useVerifyEmail } from '../../src/api/hooks/auth';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../src/theme/tokens';

export default function VerifyEmailScreen() {
  const t = useTheme();
  const router = useRouter();
  const sendCode = useSendVerificationCode();
  const verify = useVerifyEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'send' | 'verify'>('send');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.blue }, continuousCurve, shadow.card]}>
            <Icon name="bell" size={28} color="#fff" />
          </Animated.View>

          {step === 'send' ? (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text variant="title1" style={styles.h1}>Check your email</Text>
                <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
                  We'll send a 4-digit code to verify your account.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
                <TextInput
                  style={[styles.field, { color: t.label }]}
                  placeholder="Email" placeholderTextColor={t.label3}
                  autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
                />
              </Animated.View>

              {sendCode.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{sendCode.error.message}</Text>}

              <PressableScale
                style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
                onPress={() => {
                  sendCode.mutate(email);
                  setStep('verify');
                }}
                disabled={sendCode.isPending || !email}
              >
                {sendCode.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Send code</Text>}
              </PressableScale>

              <PressableScale style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]} onPress={() => router.back()}>
                <Text variant="headline" color="blue">Back to login</Text>
              </PressableScale>
            </>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <Text variant="title1" style={styles.h1}>Enter code</Text>
                <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
                  Enter the 4-digit code sent to {email}.
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
                <TextInput
                  style={[styles.field, { color: t.label, textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
                  placeholder="0000" placeholderTextColor={t.label3}
                  keyboardType="number-pad" maxLength={4} value={code} onChangeText={setCode}
                />
              </Animated.View>

              {verify.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{verify.error.message}</Text>}

              <PressableScale
                style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
                onPress={() => verify.mutate({ email, verification_code: code })}
                disabled={verify.isPending || code.length !== 4}
              >
                {verify.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Verify</Text>}
              </PressableScale>

              <PressableScale style={[styles.btnGhost, { borderColor: t.separator }, continuousCurve]} onPress={() => setStep('send')}>
                <Text variant="headline" color="blue">Resend code</Text>
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
