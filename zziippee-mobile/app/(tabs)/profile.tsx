import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { clearToken, useSession } from '../../src/stores/session';
import { Text } from '../../src/components/Text';
import { Section, Row } from '../../src/components/List';
import { useTheme, spacing, radius } from '../../src/theme/tokens';

/** Account — the iOS grouped-inset settings pattern (matches the reference modal). */
export default function AccountScreen() {
  const t = useTheme();
  const user = useSession((s) => s.user);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* best-effort revoke */ }
    await clearToken();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={styles.title}>Account</Text>

        <Section footer="Your enrollments and progress are synced to this account across your devices.">
          <Row label="SecureStart Account" value={user?.email ?? 'saaz.rai@gmail.com'} />
        </Section>

        <Section>
          <Row label="Notifications" value="Reminders" />
          <Row label="Appearance" value="System" />
          <Row label="Downloads" value="Wi-Fi only" />
        </Section>

        <Section>
          <Row label="Privacy & Data" />
          <Row label="Export My Data" />
          <Row label="Delete Account" destructive />
        </Section>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Pressable style={[styles.logout, { backgroundColor: t.cell }]} onPress={logout}>
            <Text variant="body" color="red">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  logout: { borderRadius: radius.cell, paddingVertical: 14, alignItems: 'center' },
});
