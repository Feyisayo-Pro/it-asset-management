import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';
import { normalizeAxiosError } from './error';

export const client: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * AttachAuth — every request except /auth/login and /auth/refresh
 * carries the current access token if we have one.
 */
client.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isAuthLoginOrRefresh =
    url.startsWith('/auth/login') || url.startsWith('/auth/refresh');
  const token = useAuthStore.getState().accessToken;
  if (token && !isAuthLoginOrRefresh) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * RefreshOn401 — coalesced token refresh. On the first 401 for a
 * non-auth endpoint, kicks off a single refresh; queued requests wait
 * on the same promise; if refresh fails, everything is failed and the
 * store is cleared.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const store = useAuthStore.getState();
  const rt = store.refreshToken;
  if (!rt) return null;
  try {
    const { data } = await axios.post(
      `${env.apiBaseUrl}/auth/refresh`,
      { refreshToken: rt },
      { headers: { 'Content-Type': 'application/json' } },
    );
    store.setSession({
      accessToken: data.accessToken,
      accessExpiresIn: data.accessTokenExpiresIn,
      refreshToken: data.refreshToken,
      user: store.user!,
      permissions: store.permissions,
    });
    return data.accessToken;
  } catch {
    store.clear();
    return null;
  }
}

client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const url = original.url ?? '';

    const isAuthEndpoint =
      url.startsWith('/auth/login') ||
      url.startsWith('/auth/refresh') ||
      url.startsWith('/auth/forgot-password') ||
      url.startsWith('/auth/reset-password');

    if (status === 401 && !isAuthEndpoint && !original._retried) {
      original._retried = true;
      if (!refreshInFlight) refreshInFlight = refreshAccessToken();
      const newToken = await refreshInFlight;
      refreshInFlight = null;
      if (!newToken) return Promise.reject(normalizeAxiosError(error));
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization =
        `Bearer ${newToken}`;
      return client.request(original);
    }
    return Promise.reject(normalizeAxiosError(error));
  },
);
