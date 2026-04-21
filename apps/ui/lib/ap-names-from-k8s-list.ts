import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";

/**
 * Extracts `metadata.name` from each item in a k8s list JSON (or `{ data: { items } }` wrapper).
 */
export function apNamesFromList(data: K8sGetResponse | undefined): string[] {
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
  if (!items) {
    return [];
  }
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
