import type { K8sGetResponse } from "../schemas/k8s-get";

/**
 * Raw list items from a k8s get response (`items` or nested `data.items`).
 */
export function apItemsFromList(data: K8sGetResponse | undefined): unknown[] {
  if (data == null || typeof data !== "object") {
    return [];
  }
  const root = data;
  let items: unknown[] | undefined;
  if (Array.isArray(root.items)) {
    items = root.items as unknown[];
  } else if (root.data != null && typeof root.data === "object") {
    const nested = (root.data as Record<string, unknown>).items;
    if (Array.isArray(nested)) {
      items = nested;
    }
  }
  return items ?? [];
}

/**
 * Extracts `metadata.name` from each item in a k8s list JSON (or `{ data: { items } }` wrapper).
 */
export function apNamesFromList(data: K8sGetResponse | undefined): string[] {
  const items = apItemsFromList(data);
  return items.map((item, i) => {
    if (item == null || typeof item !== "object") {
      return `ap-${i}`;
    }
    const meta = (item as Record<string, unknown>).metadata as
      | Record<string, unknown>
      | undefined;
    const name = meta?.name;
    return typeof name === "string" ? name : `ap-${i}`;
  });
}

/** Namespace + name per list item for `GET /api/telemetry/v1alpha1/metrics` (APS, DBS, or any k8s list item with metadata). */
export function apNamespaceNameTargetsFromList(
  data: K8sGetResponse | undefined,
  fallbackNamespace?: string
): { name: string; namespace: string }[] {
  const items = apItemsFromList(data);
  const out: { name: string; namespace: string }[] = [];
  for (const item of items) {
    if (item == null || typeof item !== "object") {
      continue;
    }
    const meta = (item as Record<string, unknown>).metadata as
      | Record<string, unknown>
      | undefined;
    const name = meta?.name;
    const ns =
      typeof meta?.namespace === "string" ? meta.namespace : fallbackNamespace;
    if (typeof name === "string" && ns != null && ns !== "") {
      out.push({ name, namespace: ns });
    }
  }
  return out;
}
