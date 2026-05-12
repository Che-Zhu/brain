import YAML from "yaml";

function mergeClaimSpecProjectName(
  yamlSingleDoc: string,
  kind: "AP" | "DB",
  projectClaimName: string
): string {
  const trimmed = yamlSingleDoc.trim();
  if (!trimmed) {
    return trimmed;
  }
  const parsed: unknown = YAML.parse(trimmed);
  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !("kind" in parsed) ||
    (parsed as { kind?: string }).kind !== kind
  ) {
    return trimmed;
  }
  const doc = parsed as Record<string, unknown>;
  const spec =
    typeof doc.spec === "object" && doc.spec !== null
      ? { ...(doc.spec as object) }
      : {};
  doc.spec = { ...spec, projectName: projectClaimName };
  return YAML.stringify(doc).trimEnd();
}

/**
 * Sets `spec.projectName` so the deployment-ingress composition can link workloads to the Project claim.
 */
export function mergeApSpecProjectName(
  apYamlSingleDoc: string,
  projectClaimName: string
): string {
  return mergeClaimSpecProjectName(apYamlSingleDoc, "AP", projectClaimName);
}

/**
 * Sets `spec.projectName` so DB compositions can observe the Project claim and label composed resources.
 */
export function mergeDbSpecProjectName(
  dbYamlSingleDoc: string,
  projectClaimName: string
): string {
  return mergeClaimSpecProjectName(dbYamlSingleDoc, "DB", projectClaimName);
}
