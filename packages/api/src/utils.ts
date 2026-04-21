import type { ApiRoute } from "./constants";

const DEFAULT_ORIGIN = "http://localhost:9000";

/**
 * With no `route`: API origin from `NEXT_PUBLIC_API_URL` (or {@link DEFAULT_ORIGIN}).
 * With `route`: absolute URL for that path under the same origin.
 */
export function ApiUrl(route?: ApiRoute): string {
  const base = process.env.NEXT_PUBLIC_API_URL || DEFAULT_ORIGIN;
  if (route === undefined) {
    return base;
  }
  return new URL(route, base).href;
}
