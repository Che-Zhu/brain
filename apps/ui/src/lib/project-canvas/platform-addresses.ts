export const PLATFORM_ADDRESS_ID_PATTERN = "^pa_[a-z0-9]{6,32}$";
export const PLATFORM_ADDRESS_ID_RE = new RegExp(PLATFORM_ADDRESS_ID_PATTERN);

const PLATFORM_ADDRESS_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function normalizePlatformAddressId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isPlatformAddressId(value: unknown): boolean {
  return PLATFORM_ADDRESS_ID_RE.test(normalizePlatformAddressId(value));
}

export function platformAddressIdFromValue(value: unknown): string | undefined {
  const id = normalizePlatformAddressId(value);
  return PLATFORM_ADDRESS_ID_RE.test(id) ? id : undefined;
}

export function platformAddressIdsFromRows(
  rows: readonly { id?: string }[]
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.id !== undefined) {
      ids.add(row.id);
    }
  }
  return ids;
}

export function generatePlatformAddressId(): string {
  const bytes = new Uint8Array(12);
  if (globalThis.crypto == null) {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  } else {
    globalThis.crypto.getRandomValues(bytes);
  }

  let suffix = "";
  for (const byte of bytes) {
    suffix +=
      PLATFORM_ADDRESS_ID_ALPHABET[byte % PLATFORM_ADDRESS_ID_ALPHABET.length];
  }
  return `pa_${suffix}`;
}
