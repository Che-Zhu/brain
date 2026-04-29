import type {
  EntryNodeConnectionSide,
  EntryNodeDomainKey,
  EntryNodeStatusTone,
} from "./entry-node.types";

const DOMAIN_KEYS = new Set<EntryNodeDomainKey>([
  "access",
  "private",
  "public",
]);

const CONNECTION_SIDES = new Set<EntryNodeConnectionSide>([
  "bottom",
  "left",
  "right",
  "top",
]);

export function isEntryNodeDomainKey(
  input: string
): input is EntryNodeDomainKey {
  return DOMAIN_KEYS.has(input as EntryNodeDomainKey);
}

export function isEntryNodeConnectionSide(
  input: string
): input is EntryNodeConnectionSide {
  return CONNECTION_SIDES.has(input as EntryNodeConnectionSide);
}

export function normalizeEntryNodeStatus(
  input: string | undefined
): EntryNodeStatusTone {
  const normalized = input
    ?.trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  switch (normalized) {
    case "accessible":
    case "available":
    case "bound":
    case "complete":
    case "ready":
    case "running":
    case "succeeded":
      return normalized;
    case "binding":
    case "creating":
    case "pending":
    case "progressing":
      return normalized;
    case "deleting":
    case "stopping":
      return normalized;
    case "shutdown":
    case "stopped":
      return normalized;
    case "degraded":
    case "error":
    case "failed":
    case "inaccessible":
    case "unhealthy":
      return normalized;
    default:
      return "unknown";
  }
}
