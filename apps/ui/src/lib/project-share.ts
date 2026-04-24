import { decodeJwt } from "jose";

const TRAILING_SLASH = /\/$/;

/**
 * Reads `namespace` from the share JWT payload (decodes only; does not verify the signature).
 * Used to build a preview link when the UI does not have the resolved namespace in state.
 */
export function readNamespaceFromProjectShareJwt(token: string): string | null {
  try {
    const payload = decodeJwt(token) as { namespace?: unknown };
    const ns = payload.namespace;
    return typeof ns === "string" && ns.length > 0 ? ns : null;
  } catch {
    return null;
  }
}

/** Preview page route: `/preview/project/{uid}?shareToken=…&ns=…` */
export function buildPreviewProjectShareUrl(input: {
  origin: string;
  projectUid: string;
  namespace: string;
  shareToken: string;
}): string {
  const path = `/preview/project/${encodeURIComponent(input.projectUid)}`;
  const q = new URLSearchParams({
    shareToken: input.shareToken,
    ns: input.namespace,
  });
  return `${input.origin.replace(TRAILING_SLASH, "")}${path}?${q.toString()}`;
}

export function projectShareResponseFromJson(data: unknown): {
  token: string;
  expiresAt: number;
} {
  if (data == null || typeof data !== "object") {
    throw new Error("Invalid project share response");
  }
  const root = data as Record<string, unknown>;
  const innerCandidates = [root.body, root.Body, root] as const;
  for (const c of innerCandidates) {
    if (c == null || typeof c !== "object") {
      continue;
    }
    const b = c as Record<string, unknown>;
    const token = b.token ?? b.Token;
    const exp = b.expiresAt ?? b.ExpiresAt;
    if (typeof token !== "string" || token.length === 0) {
      continue;
    }
    const n = typeof exp === "number" ? exp : Number(exp);
    if (Number.isFinite(n)) {
      return { token, expiresAt: n };
    }
  }
  throw new Error("Invalid project share response: missing token");
}
