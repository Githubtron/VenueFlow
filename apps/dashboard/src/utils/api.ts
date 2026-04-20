/**
 * API utility functions for environment-aware API calls
 */

export function getApiBaseUrl(): string {
  // In production (Vercel), use the VITE_API_URL environment variable
  // In development, use relative paths (which will be proxied by Vite)
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }

  // Default to relative paths for development (proxied by vite.config.ts)
  return '';
}

export function getWsUrl(): string {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (wsUrl) {
    return wsUrl;
  }
  // Default fallback for development
  return 'ws://localhost:3010';
}

/**
 * Build full API URL for fetch requests
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  
  // If baseUrl is empty, use relative path (for local development with Vite proxy)
  if (!baseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Otherwise, use absolute URL
  return baseUrl + (path.startsWith('/') ? path : `/${path}`);
}

/**
 * Common fetch options with error handling
 */
export const fetchOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
};
