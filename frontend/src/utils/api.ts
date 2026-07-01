const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

export function buildUrl(apiUrl: string, path: string): string {
  return `${URL_PREFIX}://${apiUrl}${path}`;
}
