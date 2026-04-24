import type { ApiRoute } from "./constants";

const DEFAULT_ORIGIN = "http://localhost:9000";

/**
 * Resolves API requests against the current browser origin in client code, so the
 * UI can always call its own `/api/...` proxy at runtime. On the server, falls
 * back to `API_URL` (or {@link DEFAULT_ORIGIN}) for direct upstream access.
 */
export function ApiUrl(route?: ApiRoute): string {
  const base =
    typeof window === "undefined"
      ? process.env.API_URL || DEFAULT_ORIGIN
      : window.location.origin;
  if (route === undefined) {
    return base;
  }
  return new URL(route, base).href;
}
