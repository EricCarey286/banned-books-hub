export const API_URL = import.meta.env.VITE_API_URL; //backend host:port
export const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

export function buildUrl(apiUrl: string, path: string): string {
  return `${URL_PREFIX}://${apiUrl}${path}`;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Fetch wrapper for the API. Sends the admin session cookie on every request (credentials: "include")
 * and, for writes, the CSRF token held in memory by App.tsx. The session itself is never readable from script.
 */
export function apiFetch(url: string, options: RequestInit = {}, csrfToken?: string | null): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (csrfToken && !SAFE_METHODS.has(method)) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  return fetch(url, { ...options, headers, credentials: 'include' });
}
