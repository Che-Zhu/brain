import type { EntryNodeDomainKey } from "./entry-node.types";

const DOMAIN_KEYS = new Set<EntryNodeDomainKey>([
  "access",
  "private",
  "public",
]);

export function isEntryNodeDomainKey(
  input: string
): input is EntryNodeDomainKey {
  return DOMAIN_KEYS.has(input as EntryNodeDomainKey);
}
