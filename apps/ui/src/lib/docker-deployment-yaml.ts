import { generatePlatformAddressId } from "@workspace/crossplane/lib/platform-address";
import type {
  DockerDeploymentEnvVar,
  DockerDeploymentSettings,
} from "@workspace/ui/lib/docker-deployment-settings";
import YAML from "yaml";
import { renderCrossplaneCompositionTemplate } from "./render-crossplane-template";

export const DEFAULT_DOCKER_AP_COMPOSITION_NAME =
  "aps-deployment-ingress-go-templating";

interface RenderDockerDeploymentYamlOptions {
  compositionName?: string;
  name: string;
  namespace: string;
  platformAddressId?: string;
  projectName: string;
  routingDomain: string;
  settings: DockerDeploymentSettings;
  template?: string;
}

function baseApClaim(options: RenderDockerDeploymentYamlOptions) {
  return {
    apiVersion: "example.crossplane.io/v1",
    kind: "AP",
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

function directEnvRows(
  rows: readonly DockerDeploymentEnvVar[]
): DockerDeploymentEnvVar[] | undefined {
  const env = rows
    .map((row) => ({ name: row.name.trim(), value: row.value }))
    .filter((row) => row.name !== "");
  return env.length === 0 ? undefined : env;
}

function metadataWithRoutingDomain(
  doc: Record<string, unknown>,
  options: RenderDockerDeploymentYamlOptions
) {
  const metadata =
    doc.metadata && typeof doc.metadata === "object"
      ? { ...(doc.metadata as Record<string, unknown>) }
      : {};
  const labels =
    metadata.labels && typeof metadata.labels === "object"
      ? { ...(metadata.labels as Record<string, unknown>) }
      : {};
  const metadataWithoutLabels = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => key !== "labels")
  );
  const labelsWithoutRegion = Object.fromEntries(
    Object.entries(labels).filter(([key]) => key !== "region")
  );
  const routingDomain = options.routingDomain.trim();
  const nextMetadata: Record<string, unknown> = {
    ...metadataWithoutLabels,
    name: options.name,
    namespace: options.namespace,
  };
  const nextLabels = routingDomain
    ? { ...labelsWithoutRegion, region: routingDomain }
    : labelsWithoutRegion;

  if (Object.keys(nextLabels).length > 0) {
    nextMetadata.labels = nextLabels;
  }

  return nextMetadata;
}

export function renderDockerDeploymentYaml(
  options: RenderDockerDeploymentYamlOptions
): string {
  const template =
    options.template == null
      ? undefined
      : renderCrossplaneCompositionTemplate(options.template, {
          image: options.settings.image,
          name: options.name,
          namespace: options.namespace,
          region: options.routingDomain,
        });
  const doc = parseTemplate(template) ?? baseApClaim(options);
  doc.apiVersion = "example.crossplane.io/v1";
  doc.kind = "AP";
  doc.metadata = metadataWithRoutingDomain(doc, options);

  const spec =
    doc.spec && typeof doc.spec === "object"
      ? { ...(doc.spec as Record<string, unknown>) }
      : {};
  const crossplane =
    spec.crossplane && typeof spec.crossplane === "object"
      ? { ...(spec.crossplane as Record<string, unknown>) }
      : {};
  const input =
    spec.input && typeof spec.input === "object"
      ? { ...(spec.input as Record<string, unknown>) }
      : {};
  const inputWithoutEnv = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "env")
  );
  const network =
    input.network && typeof input.network === "object"
      ? { ...(input.network as Record<string, unknown>) }
      : {};
  const appListeningPort = options.settings.appListeningPort;

  const nextInput: Record<string, unknown> = {
    ...inputWithoutEnv,
    image: options.settings.image.trim(),
    network: {
      ...network,
      platformAddresses: [
        {
          id: options.platformAddressId ?? generatePlatformAddressId(),
          port: appListeningPort,
        },
      ],
      privatePort: appListeningPort,
    },
  };
  const env = directEnvRows(options.settings.env);
  if (env !== undefined) {
    nextInput.env = env;
  }

  const nextSpec = {
    ...spec,
    crossplane: {
      ...crossplane,
      compositionRef: {
        name:
          options.compositionName?.trim() || DEFAULT_DOCKER_AP_COMPOSITION_NAME,
      },
    },
    input: nextInput,
    name: options.name,
    projectName: options.projectName,
  };
  doc.spec = Object.fromEntries(
    Object.entries(nextSpec).filter(([key]) => key !== "resource")
  );

  return YAML.stringify(doc).trimEnd();
}
