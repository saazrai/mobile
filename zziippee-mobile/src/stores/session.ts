import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
    // Fetch /auth/me to populate user data on cold start
    try {
      const res = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:4010'}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        set({ authed: true, user: json.data?.user ?? null });
      } else {
        // Token invalid or expired — clear it
        await clearToken();
      }
    } catch {
      // Network error — still mark as authed so the app can try to recover
      set({ authed: true });
    }
  },
}));
