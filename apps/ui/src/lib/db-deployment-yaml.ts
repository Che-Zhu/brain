import type { DatabaseInstancePreset } from "@workspace/ui/components/database-deployer";
import YAML from "yaml";
import { renderCrossplaneCompositionTemplate } from "./render-crossplane-template";

interface RenderDbDeploymentYamlOptions {
  compositionName: string;
  engine: string;
  name: string;
  namespace: string;
  projectName: string;
  quota: DatabaseInstancePreset;
  replicas: number;
  template?: string;
}

function baseDbClaim(options: RenderDbDeploymentYamlOptions) {
  return {
    apiVersion: "example.crossplane.io/v1",
    kind: "DB",
    metadata: {
      name: options.name,
      namespace: options.namespace,
    },
    spec: {},
  };
}

function parseTemplate(template: string | undefined) {
  const trimmed = template?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = YAML.parse(trimmed);
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : null;
}

function removePrivateOnlyRegionLabel(doc: Record<string, unknown>) {
  const metadata =
    doc.metadata && typeof doc.metadata === "object"
      ? { ...(doc.metadata as Record<string, unknown>) }
      : {};
  const labels =
    metadata.labels && typeof metadata.labels === "object"
      ? { ...(metadata.labels as Record<string, unknown>) }
      : {};
  const labelsWithoutRegion = Object.fromEntries(
    Object.entries(labels).filter(([key]) => key !== "region")
  );
  const metadataWithoutLabels = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => key !== "labels")
  );

  const nextMetadata: Record<string, unknown> =
    Object.keys(labelsWithoutRegion).length === 0
      ? metadataWithoutLabels
      : { ...metadata, labels: labelsWithoutRegion };
  doc.metadata = nextMetadata;
}

export function renderDbDeploymentYaml(
  options: RenderDbDeploymentYamlOptions
): string {
  const template =
    options.template == null
      ? undefined
      : renderCrossplaneCompositionTemplate(options.template, {
          name: options.name,
          namespace: options.namespace,
        });
  const doc = parseTemplate(template) ?? baseDbClaim(options);
  doc.apiVersion = "example.crossplane.io/v1";
  doc.kind = "DB";

  const metadata =
    doc.metadata && typeof doc.metadata === "object"
      ? { ...(doc.metadata as Record<string, unknown>) }
      : {};
  doc.metadata = {
    ...metadata,
    name: options.name,
    namespace: options.namespace,
  };
  removePrivateOnlyRegionLabel(doc);

  const spec =
    doc.spec && typeof doc.spec === "object"
      ? { ...(doc.spec as Record<string, unknown>) }
      : {};
  const crossplane =
    spec.crossplane && typeof spec.crossplane === "object"
      ? { ...(spec.crossplane as Record<string, unknown>) }
      : {};

  doc.spec = {
    ...spec,
    crossplane: {
      ...crossplane,
      compositionRef: { name: options.compositionName },
    },
    engine: options.engine,
    exposeNodePort: false,
    projectName: options.projectName,
    quota: options.quota,
    replicas: Math.min(10, Math.max(1, Math.round(options.replicas))),
  };

  return YAML.stringify(doc).trimEnd();
}
