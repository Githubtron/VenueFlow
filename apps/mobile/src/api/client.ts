/**
 * Axios client with silent token refresh interceptor.
 * On 401: calls POST /auth/refresh → retries original request.
 * On refresh failure: clears tokens and redirects to Login with "Session expired".
 * Requirements: 6.5, 9.5
 */
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../storage/mmkv';

const BASE_URL = 'https://api.venueflow.app';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Silent refresh on 401
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Navigation callback — set by AppNavigator after mount
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      try {
        const res = await axios.post<{
          accessToken: string;
          refreshToken: string;
        }>(`${BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken, refreshToken: newRefresh } = res.data;
        setTokens(accessToken, newRefresh);

        refreshQueue.forEach((q) => q.resolve(accessToken));
        refreshQueue = [];

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach((q) => q.reject(refreshError));
        refreshQueue = [];
        clearTokens();
        onSessionExpired?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
