import { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { PressableScale } from '../../src/components/PressableScale';
import { useRegister } from '../../src/api/hooks/auth';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../src/theme/tokens';

export default function RegisterScreen() {
  const t = useTheme();
  const router = useRouter();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={[styles.logo, { backgroundColor: t.blue }, continuousCurve, shadow.card]}>
            <Icon name="userPlus" size={28} color="#fff" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <Text variant="title1" style={styles.h1}>Create account</Text>
            <Text variant="subhead" color="label2" style={{ marginTop: 8, textAlign: 'center' }}>
              Enter your details to get started. Email must be verified first.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500).springify().damping(18)} style={[styles.card, { backgroundColor: t.cell }, continuousCurve]}>
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Full name" placeholderTextColor={t.label3}
              autoCapitalize="words" value={name} onChangeText={setName}
              accessibilityLabel="Full name input field"
              accessibilityHint="Enter your full name"
            />
            <View style={[styles.sep, { backgroundColor: t.separator }]} />
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Email" placeholderTextColor={t.label3}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
              accessibilityLabel="Email input field"
              accessibilityHint="Enter your email address"
            />
            <View style={[styles.sep, { backgroundColor: t.separator }]} />
            <TextInput
              style={[styles.field, { color: t.label }]}
              placeholder="Password" placeholderTextColor={t.label3}
              secureTextEntry value={password} onChangeText={setPassword}
              accessibilityLabel="Password input field"
              accessibilityHint="Enter your password"
            />
          </Animated.View>

          {register.isError && <Text variant="footnote" color="red" style={{ marginTop: spacing.md }}>{register.error.message}</Text>}

          <PressableScale
            style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]}
            onPress={() => register.mutate({ name, email, password })}
            disabled={register.isPending || !name || !email || !password}
            accessibilityLabel="Create account button"
            accessibilityHint="Creates a new account with the provided details"
          >
            {register.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Create account</Text>}
          </PressableScale>

          <View style={styles.footRow}>
            <Text variant="subhead" color="label2">Already have an account? </Text>
            <PressableScale onPress={() => router.back()} accessibilityLabel="Sign in link">
              <Text variant="subhead" color="blue">Sign in</Text>
            </PressableScale>
          </View>
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
  footRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
