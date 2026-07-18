import { ExpoConfig } from 'expo/config';

/**
 * Env-driven config. Values come from EAS secrets / .env per channel.
 * See docs/04-mobile-app-design.md §4.8 (Build & release).
 */
const config: ExpoConfig = {
  name: 'SecureStart',
  slug: 'zziippee-mobile',
  scheme: 'zziippee', // deep links: zziippee://verify, zziippee://reset-password, checkout return
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic', // respect system light/dark
  newArchEnabled: true,
  ios: { supportsTablet: false, bundleIdentifier: 'com.saazacademy.securestart' },
  android: { package: 'com.saazacademy.securestart' },
  plugins: ['expo-router', 'expo-secure-store'],
  extra: {
    // Per-channel via EAS: production → zziippee.com, preview → laravel.cloud.
    // Default targets the bundled mock (npm run mock) so a fresh clone runs offline.
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4010/api/v1',
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',
  },
};

export default config;
