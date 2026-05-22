import { parse as parseYaml } from "yaml";

interface KubeconfigCluster {
  cluster?: {
    server?: unknown;
  };
  name?: unknown;
}

interface KubeconfigContext {
  context?: {
    cluster?: unknown;
  };
  name?: unknown;
}

interface KubeconfigDocument {
  clusters?: unknown;
  contexts?: unknown;
  "current-context"?: unknown;
}

const KUBERNETES_LABEL_VALUE_RE =
  /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const URL_PATH_RE = /\/.*$/u;
const URL_PORT_RE = /:\d+$/u;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isRoutingDomainLabelValue(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 63 &&
    KUBERNETES_LABEL_VALUE_RE.test(trimmed)
  );
}

function serverHost(server: string): string {
  const trimmed = server.trim();
  if (trimmed === "") {
    return "";
  }
  try {
    return new URL(trimmed).hostname.trim();
  } catch {
    return trimmed
      .replace(URL_SCHEME_RE, "")
      .replace(URL_PATH_RE, "")
      .replace(URL_PORT_RE, "")
      .trim();
  }
}

function kubeconfigClusterServer(kubeconfig: KubeconfigDocument): string {
  const clusters = Array.isArray(kubeconfig.clusters)
    ? (kubeconfig.clusters as KubeconfigCluster[])
    : [];
  if (clusters.length === 0) {
    return "";
  }

  const contexts = Array.isArray(kubeconfig.contexts)
    ? (kubeconfig.contexts as KubeconfigContext[])
    : [];
  const currentContextName = trimString(kubeconfig["current-context"]);
  const currentContext = contexts.find(
    (context) => trimString(context.name) === currentContextName
  );
  const currentClusterName = trimString(currentContext?.context?.cluster);
  const currentCluster = clusters.find(
    (cluster) => trimString(cluster.name) === currentClusterName
  );
  const selectedCluster = currentCluster ?? clusters[0];
  return trimString(selectedCluster?.cluster?.server);
}

export function routingDomainFromKubeconfig(kubeconfig: string): string {
  const trimmed = kubeconfig.trim();
  if (trimmed === "") {
    return "";
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(trimmed);
  } catch {
    return "";
  }

  const doc = asRecord(parsed) as KubeconfigDocument | undefined;
  if (doc == null) {
    return "";
  }

  const host = serverHost(kubeconfigClusterServer(doc));
  return isRoutingDomainLabelValue(host) ? host : "";
}
