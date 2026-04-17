import {
  type CrossplaneServiceStatusPhase,
  STATUS_PHASE_INDICATORS,
  STATUS_PHASES,
} from "../schemas/crossplane-status-schema";

export type { CrossplaneServiceStatusPhase } from "../schemas/crossplane-status-schema";

/**
 * Maps a raw status string (e.g. from a CRD `status.phase`) to a known phase key.
 * Matching is case-insensitive; leading/trailing whitespace is trimmed.
 */
export function getToneForStatus(
  status: string | null | undefined
): CrossplaneServiceStatusPhase | undefined {
  if (status == null || status === "") {
    return undefined;
  }
  const normalized = status.trim().toLowerCase();
  if (normalized in STATUS_PHASES) {
    return normalized as CrossplaneServiceStatusPhase;
  }
  return undefined;
}

export function getStatusTextClass(tone: CrossplaneServiceStatusPhase): string {
  return STATUS_PHASES[tone];
}

export function getStatusIndicatorClass(
  tone: CrossplaneServiceStatusPhase
): string {
  return STATUS_PHASE_INDICATORS[tone];
}
