/** Max length for path + search stored in OAuth return cookie / `next` query. */
export const MAX_OAUTH_RETURN_PATH_LEN = 2048;

/**
 * Normalizes and validates a same-origin relative return target (pathname + optional search).
 * Rejects absolute URLs and protocol-relative paths to avoid open redirects.
 */
export function parseOAuthReturnPathParam(raw: string | null): string | null {
  if (raw == null || raw === "") {
    return null;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  decoded = decoded.trim();
  if (decoded.length > MAX_OAUTH_RETURN_PATH_LEN) {
    return null;
  }
  if (!decoded.startsWith("/")) {
    return null;
  }
  if (decoded.startsWith("//")) {
    return null;
  }
  if (decoded.includes("://")) {
    return null;
  }
  if (decoded.includes("\n") || decoded.includes("\r")) {
    return null;
  }
  return decoded;
}
