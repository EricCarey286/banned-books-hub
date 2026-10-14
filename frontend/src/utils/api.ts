export const API_URL = import.meta.env.VITE_API_URL; //backend host:port
export const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

export function buildUrl(apiUrl: string, path: string): string {
  return `${URL_PREFIX}://${apiUrl}${path}`;
}
