import { useMutation } from '@tanstack/react-query';
import * as Device from 'expo-constants';
import { postData } from '../client';
import { setToken, useSession, type User } from '../../stores/session';

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
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      postData<AuthResponse>('/auth/register', { ...body, device_name: deviceName }),
    onSuccess: async (data) => setToken(data.token),
  });
}
