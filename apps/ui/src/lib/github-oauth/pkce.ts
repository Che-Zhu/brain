import "server-only";

import { createHash, randomBytes } from "node:crypto";

const TRAILING_EQ_RE = /=+$/;

export interface PKCEPair {
  challenge: string;
  verifier: string;
}

/** RFC 7636 PKCE: 64-char hex verifier + S256 challenge (base64url, no padding). */
export function generatePKCE(): PKCEPair {
  const verifier = randomBytes(32).toString("hex");
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(TRAILING_EQ_RE, "");
  return { verifier, challenge };
}
