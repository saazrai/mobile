import { useMutation } from '@tanstack/react-query';
import * as Device from 'expo-constants';
import { getData, postData } from '../client';
import { clearToken, setToken, useSession, type User } from '../../stores/session';

interface AuthResponse {
  token: string;
  user: User;
}

const deviceName = 'mobile-app'; // replace with a real device name in production

export function useLogin() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      postData<AuthResponse>('/auth/login', { ...creds, device_name: deviceName }),
    onSuccess: async (data) => {
      await setToken(data.token);
      setUser(data.user);
    },
  });
}

export function useGoogleSignIn() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({
    // id_token comes from @react-native-google-signin native SDK
    mutationFn: (idToken: string) =>
      postData<AuthResponse>('/auth/social/google', {
        id_token: idToken,
        device_name: deviceName,
      }),
    onSuccess: async (data) => {
      await setToken(data.token);
      setUser(data.user);
    },
  });
}

export function useRegister() {
  const setUser = useSession((s) => s.setUser);
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      postData<AuthResponse>('/auth/register', { ...body, device_name: deviceName }),
    onSuccess: async (data) => {
      await setToken(data.token);
      setUser(data.user);
    },
  });
}

export function useSendVerificationCode() {
  return useMutation({
    mutationFn: (email: string) =>
      postData('/auth/email/send-code', { email, consent: true }),
  });
}

export interface VerifyEmailBody {
  email: string;
  verification_code: string;
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: VerifyEmailBody) =>
      postData<{ verified: boolean }>('/auth/email/verify-code', body),
  });
}

export interface ForgotPasswordBody {
  email: string;
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordBody) =>
      postData<void>('/auth/forgot-password', body),
  });
}

export interface AccountPreferences {
  theme?: 'light' | 'dark';
  font_size?: 'small' | 'medium' | 'large';
  animations_enabled?: boolean;
}

export function useAccountPreferences() {
  return useMutation({
    mutationFn: (prefs: Partial<AccountPreferences>) =>
      postData<void>('/account/preferences', prefs),
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: () => getData<null>('/account/export'),
  });
}

export interface AnonymizeAccountBody {
  password: string;
  confirmation: 'DELETE';
}

export function useAnonymizeAccount() {
  const clearSession = useSession((s) => s.setUser);
  return useMutation({
    mutationFn: (body: AnonymizeAccountBody) =>
      postData<void>('/account', body),
    onSuccess: async () => {
      clearSession(null);
      await clearToken();
    },
  });
}
