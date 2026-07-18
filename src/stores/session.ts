import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { getData } from '../api/client';
import { queryClient } from '../api/queryClient';

const TOKEN_KEY = 'zz_token';

/**
 * The Sanctum token lives ONLY in SecureStore (Keychain / Keystore) — never in
 * AsyncStorage or Zustand-persisted state. See docs/04 §4.7.
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  useSession.getState().setAuthed(true);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  queryClient.clear();
  useSession.getState().setAuthed(false);
  useSession.getState().setUser(null);
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  roles: string[];
}

interface SessionState {
  authed: boolean | null; // null = still checking on cold start
  user: User | null;
  setAuthed: (v: boolean) => void;
  setUser: (u: User | null) => void;
  hydrate: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  authed: null,
  user: null,
  setAuthed: (authed) => set({ authed }),
  setUser: (user) => set({ user }),
  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ authed: false });
      return;
    }
    // Use the shared API client so this request has the same base URL, timeout,
    // authorization header, and error handling as every other API request.
    try {
      const response = await getData<User | { user: User }>('/auth/me');
      const user = 'user' in response ? response.user : response;
      set({ authed: true, user });
    } catch {
      // A saved credential is not enough to establish an authenticated session.
      // Fail closed on invalid tokens and unavailable authentication services.
      await clearToken();
    }
  },
}));
