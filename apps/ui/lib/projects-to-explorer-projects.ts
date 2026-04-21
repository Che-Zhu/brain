import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { ProjectExplorerProject } from "@workspace/ui/components/project-explorer/project-explorer";

/** One Project from `kubectl get projects -o json` / k8s get `kind=projects` (example.crossplane.io/v1). */
export interface ProjectListItem {
  metadata?: {
    creationTimestamp?: string;
    name?: string;
    uid?: string;
  };
  spec?: {
    public?: boolean;
    /** Not part of the core Project XRD; kept for optional display fallbacks. */
    title?: string;
  };
}

/** List envelope returned by the k8s get API for CRD lists. */
export interface ProjectListEnvelope {
  items?: ProjectListItem[];
}

function getProjectItems(
  data: K8sGetResponse | undefined
): ProjectListItem[] | undefined {
  if (data == null || typeof data !== "object") {
    return undefined;
  }
  const root = data as Record<string, unknown>;
  if (Array.isArray(root.items)) {
    return root.items as ProjectListItem[];
  }
  const nested = root.data;
  if (nested != null && typeof nested === "object") {
    const items = (nested as ProjectListEnvelope).items;
    if (Array.isArray(items)) {
      return items;
    }
  }
  return undefined;
}

/**
 * Maps a Project list (or unknown k8s get / SWR `data` payload) into
 * {@link ProjectExplorerProject} rows for {@link ProjectExplorer}.
 */
export function projectsListToExplorerProjects(
  data: K8sGetResponse | undefined
): ProjectExplorerProject[] {
  const items = getProjectItems(data);
  if (!items) {
    return [];
  }
  return items.map((item, index) => {
    const meta = item.metadata ?? {};
    const id = meta.uid ?? meta.name ?? `project-${index}`;
    const name =
      meta.name ??
      item.spec?.title ??
      (typeof id === "string" ? id : "Untitled");
    const createdAt = meta.creationTimestamp ?? "";
    return { id, name, createdAt };
  });
}
