import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { ProjectExplorerProject } from "@workspace/ui/components/project-explorer/project-explorer";

/** Key on `metadata.annotations` for the UI display name (merge-patched on rename). */
export const PROJECT_DISPLAY_NAME_ANNOTATION_KEY = "displayName";

/** One Project from `kubectl get projects -o json` / k8s get `kind=projects` (example.crossplane.io/v1). */
export interface ProjectListItem {
  metadata?: {
    creationTimestamp?: string;
    name?: string;
    uid?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    public?: boolean;
    /** Legacy display fallback when {@link PROJECT_DISPLAY_NAME_ANNOTATION_KEY} is unset. */
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

function projectExplorerDisplayName(item: ProjectListItem): string | undefined {
  const fromAnnotation =
    item.metadata?.annotations?.[PROJECT_DISPLAY_NAME_ANNOTATION_KEY]?.trim();
  if (fromAnnotation && fromAnnotation.length > 0) {
    return fromAnnotation;
  }
  const legacyTitle = item.spec?.title?.trim();
  if (legacyTitle && legacyTitle.length > 0) {
    return legacyTitle;
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
    const resourceName =
      typeof meta.name === "string" && meta.name !== "" ? meta.name : undefined;
    const displayName = projectExplorerDisplayName(item);
    let name =
      displayName ??
      resourceName ??
      (typeof id === "string" && id !== "" ? id : undefined);
    if (!name || name === "") {
      name = "Untitled";
    }
    const createdAt = meta.creationTimestamp ?? "";
    const specPublic = item.spec?.public;
    const base: ProjectExplorerProject = {
      id,
      name,
      createdAt,
      ...(resourceName === undefined ? {} : { resourceName }),
    };
    if (specPublic === null || specPublic === undefined) {
      return base;
    }
    return { ...base, public: specPublic };
  });
}
