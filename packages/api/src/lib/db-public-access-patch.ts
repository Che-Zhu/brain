export interface DbPublicAccessPatchMetadata {
  labels?: Record<string, unknown>;
}

export interface DbPublicAccessPatchOptions {
  metadata?: DbPublicAccessPatchMetadata;
  routingDomain?: string;
}

export interface DbPublicAccessMergePatch {
  metadata?: {
    labels: {
      region: string;
    };
  };
  spec: {
    exposeNodePort: boolean;
  };
}

const KUBERNETES_LABEL_VALUE_RE =
  /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])$/;

function isRoutingDomainLabelValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 63 &&
    KUBERNETES_LABEL_VALUE_RE.test(trimmed)
  );
}

function hasRegionLabel(metadata: DbPublicAccessPatchMetadata | undefined) {
  const region = metadata?.labels?.region;
  return typeof region === "string" && region.trim() !== "";
}

export function buildDbPublicAccessMergePatch(
  nextEnabled: boolean,
  options: DbPublicAccessPatchOptions = {}
): DbPublicAccessMergePatch {
  const patch: DbPublicAccessMergePatch = {
    spec: { exposeNodePort: nextEnabled },
  };
  const routingDomain = options.routingDomain?.trim() ?? "";

  if (
    nextEnabled &&
    routingDomain !== "" &&
    isRoutingDomainLabelValue(routingDomain) &&
    !hasRegionLabel(options.metadata)
  ) {
    patch.metadata = { labels: { region: routingDomain } };
  }

  return patch;
}
