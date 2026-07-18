import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { getToken, clearToken } from '../stores/session';

const baseURL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? '';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// Attach the Sanctum bearer token to every request.
api.interceptors.request.use(async (cfg) => {
  const token = await getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Normalize errors; on 401 wipe the token so the app routes back to Login.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      await clearToken();
    }
    return Promise.reject(normalizeError(error));
  },
);

export interface ApiError {
  message: string;
  code?: string | null;
  errors?: Record<string, string[]>;
  // Present on exam 409 conflicts (docs/08-exam-spec.md §8.6) — the server's
  // current optimistic-lock counter, so the client can resync and let the user retry.
  state_version?: number | null;
}

export class ApiRequestError extends Error {
  status?: number;
  code?: string | null;
  fieldErrors?: Record<string, string[]>;
  stateVersion?: number | null;
  constructor(e: ApiError, status?: number) {
    super(e.message || 'Something went wrong');
    this.status = status;
    this.code = e.code;
    this.fieldErrors = e.errors;
    this.stateVersion = e.state_version;
  }
}

function normalizeError(error: AxiosError<ApiError>): ApiRequestError {
  const data = error.response?.data;
  return new ApiRequestError(
    data ?? { message: error.message },
    error.response?.status,
  );
}

/** Envelope unwrap helper — all responses are { data, message?, meta? }. */
export async function getData<T>(url: string, params?: object): Promise<T> {
  const res = await api.get<{ data: T }>(url, { params });
  return res.data.data;
}

export async function postData<T>(url: string, body?: object): Promise<T> {
  const res = await api.post<{ data: T }>(url, body);
  return res.data.data;
}
