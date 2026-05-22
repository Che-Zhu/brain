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
 * Sets the routing-domain label used by the AP composition to allocate Public
 * Address hosts.
 */
export function mergeApMetadataRegion(
  apYamlSingleDoc: string,
  routingDomain: string
): string {
  const domain = routingDomain.trim();
  const trimmed = apYamlSingleDoc.trim();
  if (!(trimmed && domain)) {
    return trimmed;
  }
  const parsed: unknown = YAML.parse(trimmed);
  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !("kind" in parsed) ||
    (parsed as { kind?: string }).kind !== "AP"
  ) {
    return trimmed;
  }

  const doc = parsed as Record<string, unknown>;
  const metadata =
    typeof doc.metadata === "object" && doc.metadata !== null
      ? { ...(doc.metadata as Record<string, unknown>) }
      : {};
  const labels =
    typeof metadata.labels === "object" && metadata.labels !== null
      ? { ...(metadata.labels as Record<string, unknown>) }
      : {};
  labels.region = domain;
  doc.metadata = { ...metadata, labels };
  return YAML.stringify(doc).trimEnd();
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
