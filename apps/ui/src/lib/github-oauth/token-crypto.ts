import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

import type { EncryptedSecretPayload } from "@/lib/chat-persistence/schema";

const ALGORITHM = "aes-256-gcm";
const BASE64_32_BYTE_RE = /^[A-Za-z0-9+/]{43}=$/;
const DERIVED_KEY_SALT = "sealai-github-credential-v1";

function keyFromEnv(): Buffer {
  const raw = process.env.GITHUB_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "GITHUB_CREDENTIAL_ENCRYPTION_KEY is required to store GitHub credentials."
    );
  }

  if (BASE64_32_BYTE_RE.test(raw)) {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  }

  return scryptSync(raw, DERIVED_KEY_SALT, 32);
}

export function encryptGithubToken(token: string): EncryptedSecretPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFromEnv(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    version: 1,
  };
}

export function decryptGithubToken(payload: EncryptedSecretPayload): string {
  if (payload.version !== 1) {
    throw new Error("Unsupported GitHub credential encryption version.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    keyFromEnv(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
