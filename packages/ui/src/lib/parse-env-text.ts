/**
 * Kubernetes env var name: letters, digits, '_', '-', '.'; must not start with a digit.
 * @see https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#envvar-v1-core
 */
const K8S_ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

export interface ParsedEnvPair {
  name: string;
  value: string;
}

/**
 * Parse .env-style `KEY=value` lines. Skips blank lines, `#` comments, lines without `=`,
 * and keys that are not valid container env names (filters pasted tables / junk).
 */
export function parseEnvText(text: string): ParsedEnvPair[] {
  const out: ParsedEnvPair[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const name = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (name.length === 0 || !K8S_ENV_NAME_RE.test(name)) {
      continue;
    }
    out.push({ name, value });
  }
  return out;
}

/** Serialize env entries for the raw editor textarea (round-trip display). */
export function envToText(
  entries: ReadonlyArray<{ name?: string; value?: string }>
): string {
  return entries.map((e) => `${e.name ?? ""}=${e.value ?? ""}`).join("\n");
}
