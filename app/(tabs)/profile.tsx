import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, View, Alert, Switch, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { clearToken, useSession } from '../../src/stores/session';
import { Text } from '../../src/components/Text';
import { Section, Row } from '../../src/components/List';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { useAccountPreferences, useExportData, useAnonymizeAccount } from '../../src/api/hooks/auth';

/** Account — the iOS grouped-inset settings pattern (matches the reference modal). */
export default function AccountScreen() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const systemScheme = useColorScheme();
  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* best-effort revoke */ }
    await clearToken();
  };

  // Dark mode state: track locally, sync to server on change (future improvement)
  const [darkModeEnabled, setDarkModeEnabled] = useState(systemScheme === 'dark');
  const accountPrefs = useAccountPreferences();
  const exportData = useExportData();
  const anonymizeAccount = useAnonymizeAccount();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={styles.title}>Account</Text>

        <Section footer="Your enrollments and progress are synced to this account across your devices.">
          <Row label="SecureStart Account" value={user?.email ?? 'Loading...'} />
        </Section>

        <Section header="Preferences">
          <Row label="Notifications" value="Reminders" onPress={() => Alert.alert('Coming soon', 'Notification settings will be available in a future update.')} />
          <View style={[styles.prefRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]}>
            <Text variant="body">Dark Mode</Text>
            <Switch value={darkModeEnabled} onValueChange={(val) => setDarkModeEnabled(val)} trackColor={{ false: '#767577', true: darkModeEnabled ? '#34c759' : '#767577' }} thumbColor="#fff" />
          </View>
          <Row label="Downloads" value="Wi-Fi only" onPress={() => Alert.alert('Coming soon', 'Download settings will be available in a future update.')} />
        </Section>

        <Section header="Privacy & Data">
          <Pressable style={[styles.privacyRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]} onPress={() => exportData.mutate()}>
            <Text variant="body" color={t.label as any}>Export My Data</Text>
            {exportData.isPending && <ActivityIndicator color={t.blue} />}
          </Pressable>
          <Pressable style={[styles.privacyRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]} onPress={() => Alert.alert('Anonymize Account', 'Your account will be anonymized. All personal data will be removed from our servers.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Anonymize', style: 'destructive', onPress: () => anonymizeAccount.mutate({ password: '', confirmation: 'DELETE' }) }
          ])}>
            <Text variant="body" color={t.label as any}>Anonymize Account</Text>
          </Pressable>
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
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  privacyRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
