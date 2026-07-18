import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../src/stores/session';
import { useOffline } from '../src/hooks/useOffline';
import { OfflineBanner } from '../src/components/OfflineBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 60_000 },
  },
});

/** Returns the parsed deep link if it matches zziippee://reset[?...], else null. */
function parseResetLink(url: string): string | null {
  const parsed = Linking.parse(url);
  return parsed.scheme === 'zziippee' && parsed.path === '/reset' ? url : null;
}

/** Routes the user in/out of the (auth) group based on token presence. */
function AuthGate() {
  const authed = useSession((s) => s.authed);
  const hydrate = useSession((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Cold-start deep link: if the app was opened via zziippee://reset?... handle it.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const reset = parseResetLink(url ?? '');
      if (reset) router.replace(reset);
    });
  }, []);

  // Live deep link: while the app is running, handle incoming URLs.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const reset = parseResetLink(url);
      if (reset) router.replace(reset);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (authed === null) return; // still checking cold-start token
    const inAuthGroup = segments[0] === '(auth)';
    if (!authed && !inAuthGroup) router.replace('/(auth)/login');
    else if (authed && inAuthGroup) router.replace('/(tabs)');
  }, [authed, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  const isOffline = useOffline();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          {isOffline && <OfflineBanner />}
          <AuthGate />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
