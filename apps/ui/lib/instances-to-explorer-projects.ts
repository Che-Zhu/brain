import type { ProjectExplorerProject } from "@workspace/ui/components/project-explorer/project-explorer";

/** One Instance from `kubectl get instance -o json` / k8s get `kind=instance`. */
export interface InstanceListItem {
  metadata?: {
    creationTimestamp?: string;
    name?: string;
    uid?: string;
  };
  spec?: {
    title?: string;
  };
}

/** List envelope returned by the k8s get API for CRD lists. */
export interface InstanceListEnvelope {
  items?: InstanceListItem[];
}

function getInstanceItems(data: unknown): InstanceListItem[] | undefined {
  if (data == null || typeof data !== "object") {
    return undefined;
  }
  const root = data as Record<string, unknown>;
  if (Array.isArray(root.items)) {
    return root.items as InstanceListItem[];
  }
  const nested = root.data;
  if (nested != null && typeof nested === "object") {
    const items = (nested as InstanceListEnvelope).items;
    if (Array.isArray(items)) {
      return items;
    }
  }
  return undefined;
}

/**
 * Maps an Instance list (or unknown `useK8SGet` payload) into
 * {@link ProjectExplorerProject} rows for {@link ProjectExplorer}.
 */
export function instancesListToExplorerProjects(
  data: unknown
): ProjectExplorerProject[] {
  const items = getInstanceItems(data);
  if (!items) {
    return [];
  }
  return items.map((item, index) => {
    const meta = item.metadata ?? {};
    const id = meta.uid ?? meta.name ?? `instance-${index}`;
    const name =
      meta.name ??
      item.spec?.title ??
      (typeof id === "string" ? id : "Untitled");
    const createdAt = meta.creationTimestamp ?? "";
    return { id, name, createdAt };
  });
}
