/**
 * Runtime backend-URL resolution — mirrors the original Angular monitor.
 *
 * The legacy app loaded `assets/config.json` ({ ip, port }) at startup and built
 * every request as `http://{ip}:{port}/<route>`. We do the same here: ops can
 * repoint the backend by editing `config.json` in the deployed `monitor/` folder
 * — no rebuild required. `VITE_API_URL` stays as a build-time fallback for dev.
 */

interface RuntimeConfig {
  ip?: string;
  port?: number | string;
}

const ENV_FALLBACK =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

let apiBase: string | null = null;

/**
 * Fetch `config.json` once and derive the base URL. Never throws — on any
 * failure it falls back to the env/localhost value so the app always boots.
 * Call this before rendering (see main.tsx).
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    // BASE_URL is vite's `base` ('/new-monitor/'), so this resolves to
    // /new-monitor/config.json both in dev and in the Apache-served build.
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const cfg = (await res.json()) as RuntimeConfig;
    if (cfg.ip && cfg.port) {
      apiBase = `http://${cfg.ip}:${cfg.port}`;
      console.log('[runtimeConfig] backend base =', apiBase, '(from config.json)');
      return;
    }
    console.warn('[runtimeConfig] config.json missing ip/port; using fallback');
  } catch (err) {
    console.warn('[runtimeConfig] could not load config.json; using fallback:', err);
  }
  apiBase = ENV_FALLBACK;
}

/**
 * Resolved backend base URL (`http://{ip}:{port}`) used for both REST (axios)
 * and Socket.IO. Resolves lazily to the env/localhost fallback if
 * loadRuntimeConfig() has not completed, so nothing breaks.
 */
export function getApiBase(): string {
  return apiBase ?? ENV_FALLBACK;
}
