/**
 * Helpers for listing Crossplane `Composition` CRs returned by {@link API_ROUTES.k8s.get} `kind=compositions`.
 */

import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";

/** Crossplane Composition annotation: remote icon URL (preferred). */
export const COMPOSITION_ICON_URL_KEY = "meta.crossplane.io/icon-url";
/** Crossplane Composition annotation: `data:image/...;base64,...` etc. */
export const COMPOSITION_ICON_DATA_KEY = "meta.crossplane.io/icon-data";
/** Crossplane Composition annotation: example manifest / template YAML for UIs (`meta.crossplane.io/template`). */
export const COMPOSITION_TEMPLATE_ANNOTATION_KEY =
  "meta.crossplane.io/template";

const DISPLAY_NAME_ANNOTATION_KEY = "meta.crossplane.io/display-name";
const DESCRIPTION_ANNOTATION_KEY = "meta.crossplane.io/description";

export type CrossplaneCompositionRaw = Record<string, unknown>;

export type CompositionListFilter =
  | string
  | Record<string, unknown>
  | ((item: CrossplaneCompositionRaw) => boolean);

/** Normalized Composition row for list/detail UIs. */
export interface CompositionListItem {
  description: string;
  iconUrl?: string;
  kind: string;
  metadata: {
    compositionName: string;
    engine?: string;
    compositionUid?: string;
  };
  name: string;
  /** `meta.crossplane.io/template` (example claim YAML) when present on the Composition. */
  template?: string;
}

export function compositionIconFromAnnotations(
  annotations: Record<string, string> | undefined
): string | undefined {
  if (!annotations) {
    return undefined;
  }
  const url = annotations[COMPOSITION_ICON_URL_KEY]?.trim();
  if (url) {
    return url;
  }
  const data = annotations[COMPOSITION_ICON_DATA_KEY]?.trim();
  return data === "" ? undefined : data;
}

export function compositionTemplateFromAnnotations(
  annotations: Record<string, string> | undefined
): string | undefined {
  const t = annotations?.[COMPOSITION_TEMPLATE_ANNOTATION_KEY]?.trim();
  return t === "" ? undefined : t;
}

function getAt(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!isPlainObject(cur)) {
      return undefined;
    }
    cur = cur[p];
  }
  return cur;
}

function hasPath(obj: unknown, path: string): boolean {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!(isPlainObject(cur) && p in cur)) {
      return false;
    }
    cur = cur[p];
  }
  return true;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function compositeTypeRefKind(item: CrossplaneCompositionRaw): string {
  const k = getAt(item, "spec.compositeTypeRef.kind");
  return typeof k === "string" ? k : "";
}

export function filterCompositionsForXrKind(
  items: CrossplaneCompositionRaw[],
  xrKind: string
): CrossplaneCompositionRaw[] {
  const want = xrKind.trim().toLowerCase();
  if (!want) {
    return [];
  }
  return items.filter((it) => compositeTypeRefKind(it).toLowerCase() === want);
}

export function extractK8sListItems(parsed: K8sGetResponse): unknown[] {
  const top = parsed.items;
  if (Array.isArray(top)) {
    return top;
  }
  const nested = parsed.data?.items;
  if (Array.isArray(nested)) {
    return nested;
  }
  return [];
}

function titleCaseName(name: string): string {
  return name
    .split("-")
    .map((part) =>
      part.length === 0
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function matchByStringFilter(
  item: CrossplaneCompositionRaw,
  filter: string
): boolean {
  const expr = filter.trim();
  if (!expr) {
    return true;
  }
  const equalIndex = expr.indexOf("=");
  if (equalIndex >= 0) {
    const path = expr.slice(0, equalIndex).trim();
    const expected = expr.slice(equalIndex + 1).trim();
    if (!path) {
      return true;
    }
    const actual = getAt(item, path);
    return String(actual ?? "") === expected;
  }
  return hasPath(item, expr);
}

function loosePatternMatch(
  target: unknown,
  pattern: Record<string, unknown>
): boolean {
  if (!isPlainObject(target)) {
    return false;
  }
  for (const [k, v] of Object.entries(pattern)) {
    const tv = target[k];
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      isPlainObject(v)
    ) {
      if (typeof tv !== "object" || tv === null || !loosePatternMatch(tv, v)) {
        return false;
      }
    } else if (tv !== v) {
      return false;
    }
  }
  return true;
}

export function applyCompositionExtraFilter(
  items: CrossplaneCompositionRaw[],
  filter?: CompositionListFilter
): CrossplaneCompositionRaw[] {
  if (!filter) {
    return items;
  }
  if (typeof filter === "function") {
    return items.filter(filter);
  }
  if (typeof filter === "string") {
    return items.filter((item) => matchByStringFilter(item, filter));
  }
  return items.filter((item) => loosePatternMatch(item, filter));
}

export function getCompositionFilterStableKey(
  filter?: CompositionListFilter
): string {
  if (!filter) {
    return "none";
  }
  if (typeof filter === "function") {
    return "fn";
  }
  if (typeof filter === "string") {
    return `str:${filter}`;
  }
  return `obj:${JSON.stringify(filter)}`;
}

export function compositionsRawToListItems(
  items: CrossplaneCompositionRaw[]
): CompositionListItem[] {
  return items.map((item) => {
    const name =
      typeof getAt(item, "metadata.name") === "string"
        ? (getAt(item, "metadata.name") as string)
        : "unknown";
    const annotations = getAt(item, "metadata.annotations") as
      | Record<string, string>
      | undefined;
    const displayNameRaw = annotations?.[DISPLAY_NAME_ANNOTATION_KEY]?.trim();
    const displayName = displayNameRaw || titleCaseName(name);
    const xrKind =
      (getAt(item, "spec.compositeTypeRef.kind") as string) || "unknown";
    const descriptionRaw =
      annotations?.[DESCRIPTION_ANNOTATION_KEY] ??
      getAt(item, "spec.compositeTypeRef.apiVersion") ??
      getAt(item, "spec.compositeTypeRef.name");
    const description =
      typeof descriptionRaw === "string" ? descriptionRaw : "";

    const templateRaw = compositionTemplateFromAnnotations(annotations);

    return {
      description,
      iconUrl: compositionIconFromAnnotations(annotations),
      kind: xrKind,
      metadata: {
        compositionName: name,
        engine:
          typeof getAt(item, "metadata.labels.engine") === "string"
            ? (getAt(item, "metadata.labels.engine") as string)
            : undefined,
        compositionUid:
          typeof getAt(item, "metadata.uid") === "string"
            ? (getAt(item, "metadata.uid") as string)
            : undefined,
      },
      name: displayName,
      template: templateRaw,
    };
  });
}
