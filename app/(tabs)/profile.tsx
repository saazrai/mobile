import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Pressable, View, Alert, Switch, ActivityIndicator, useColorScheme, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getData, postData } from '../../src/api/client';
import { clearToken, useSession } from '../../src/stores/session';
import { Text } from '../../src/components/Text';
import { Section, Row } from '../../src/components/List';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { useExportData, useAnonymizeAccount, type AccountPreferences } from '../../src/api/hooks/auth';

/** Account — the iOS grouped-inset settings pattern (matches the reference modal). */
export default function AccountScreen() {
  const t = useTheme();
  const user = useSession((s) => s.user);
  const systemScheme = useColorScheme();
  const logout = async () => {
    try { await postData('/auth/logout'); } catch { /* best-effort revoke */ }
    await clearToken();
  };

  // Dark mode: server is source of truth, local fallback while loading.
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null);
  useEffect(() => {
    getData<AccountPreferences>('/account/preferences').then(setPrefs).catch(() => {});
  }, []);

  // Server is source of truth for dark mode; fall back to system scheme while loading.
  const serverTheme = prefs?.theme;
  const darkModeEnabled: boolean = serverTheme === 'dark' || (!serverTheme && systemScheme === 'dark');

  const updatePref = async <K extends keyof AccountPreferences>(key: K, value: AccountPreferences[K]) => {
    try {
      await postData<AccountPreferences>('/account/preferences', { [key]: value });
      setPrefs((prev) => ({ ...(prev ?? {}), [key]: value }));
    } catch { /* server unavailable — keep local state for UX responsiveness */ }
  };

  const exportData = useExportData();
  const anonymizeAccount = useAnonymizeAccount();
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const confirmAnonymize = () => {
    if (!password || confirmation !== 'DELETE') return;
    anonymizeAccount.mutate(
      { password, confirmation: 'DELETE' },
      { onSuccess: () => { setPassword(''); setConfirmation(''); setAnonymizeOpen(false); } },
    );
  };

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
            <Switch
              value={darkModeEnabled}
              onValueChange={(val) => updatePref('theme', val ? 'dark' : 'light')}
              trackColor={{ false: '#767577', true: darkModeEnabled ? '#34c759' : '#767577' }}
              thumbColor="#fff"
              accessibilityLabel="Toggle dark mode"
              accessibilityHint={darkModeEnabled ? 'Dark mode is on. Toggle to switch to light mode.' : 'Dark mode is off. Toggle to switch to dark mode.'}
            />
          </View>
          <Row label="Downloads" value="Wi-Fi only" onPress={() => Alert.alert('Coming soon', 'Download settings will be available in a future update.')} />
        </Section>

        <Section header="Privacy & Data">
          <Pressable style={[styles.privacyRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]} onPress={() => exportData.mutate()}>
            <Text variant="body" color={t.label as any}>Export My Data</Text>
            {exportData.isPending && <ActivityIndicator color={t.blue} />}
          </Pressable>
          <Pressable style={[styles.privacyRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]} onPress={() => setAnonymizeOpen(true)}>
            <Text variant="body" color={t.label as any}>Anonymize Account</Text>
          </Pressable>
        </Section>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Pressable style={[styles.logout, { backgroundColor: t.cell }]} onPress={logout}>
            <Text variant="body" color="red">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal visible={anonymizeOpen} transparent animationType="fade" onRequestClose={() => setAnonymizeOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, { backgroundColor: t.cell }]}>
            <Text variant="title3">Anonymize account</Text>
            <Text variant="body" color="label2" style={{ marginTop: spacing.sm }}>This permanently anonymizes your personal data. Enter your password and type DELETE to continue.</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Current password" placeholderTextColor={t.label3} style={[styles.input, { color: t.label, borderColor: t.separator }]} accessibilityLabel="Current password for account anonymization" />
            <TextInput value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" placeholder="Type DELETE to confirm" placeholderTextColor={t.label3} style={[styles.input, { color: t.label, borderColor: t.separator }]} accessibilityLabel="Type DELETE to confirm account anonymization" />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setAnonymizeOpen(false)} style={styles.modalButton}><Text variant="headline" color="blue">Cancel</Text></Pressable>
              <Pressable onPress={confirmAnonymize} disabled={!password || confirmation !== 'DELETE' || anonymizeAccount.isPending} style={styles.modalButton} accessibilityLabel="Confirm account anonymization">
                {anonymizeAccount.isPending ? <ActivityIndicator color={t.red} /> : <Text variant="headline" color={!password || confirmation !== 'DELETE' ? 'label3' : 'red'}>Anonymize</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  logout: { borderRadius: radius.cell, paddingVertical: 14, alignItems: 'center' },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  privacyRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { borderRadius: radius.card, padding: spacing.xl },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.control, paddingHorizontal: spacing.md, paddingVertical: 12, marginTop: spacing.md, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg, marginTop: spacing.lg },
  modalButton: { minHeight: 44, justifyContent: 'center' },
});
