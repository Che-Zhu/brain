import "server-only";

import type { RegistryNavItem, RegistrySidebarSection } from "./nav-types";
import {
  type RegistryIndex,
  type RegistryPreviewItem,
  Index as RootIndex,
} from "./preview-registry";

/** Merged registry index (extend here when additional packs export an `Index`). */
function getMergedRegistryIndex(): RegistryIndex {
  return { ...RootIndex };
}

/** URL path segments: `{style}/{group}/{name}` (no leading slash). */
export function registryItemRoutePath(
  item: Pick<RegistryNavItem, "style" | "group" | "name">
): string {
  return `${item.style}/${item.group}/${item.name}`;
}

function entryToNavItem(entry: RegistryPreviewItem): RegistryNavItem {
  return {
    style: entry.style,
    group: entry.group,
    name: entry.name,
    title: entry.title,
    description: entry.description,
    state: entry.state,
  };
}

/** Resolve a registry preview by hierarchical route (matches URL under `/registry/...`). */
export function getRegistryPreviewByPath(
  style: string,
  group: string,
  name: string
): RegistryPreviewItem | undefined {
  const merged = getMergedRegistryIndex();
  const byKey = merged[`${style}/${group}/${name}`];
  if (byKey) {
    return byKey;
  }
  return Object.values(merged).find(
    (e) => e.style === style && e.group === group && e.name === name
  );
}

/** Flat list sorted by style, group, then title. */
export function getRegistryNavItems(): RegistryNavItem[] {
  return Object.values(getMergedRegistryIndex())
    .map(entryToNavItem)
    .sort((a, b) => {
      const byStyle = a.style.localeCompare(b.style);
      if (byStyle !== 0) {
        return byStyle;
      }
      const byGroup = a.group.localeCompare(b.group);
      if (byGroup !== 0) {
        return byGroup;
      }
      return a.title.localeCompare(b.title);
    });
}

/**
 * Sidebar sections: grouped by `style` then `group` (e.g. linear + components).
 * Section order: style, then group; items sorted by title.
 */
export function getRegistrySidebarSections(): RegistrySidebarSection[] {
  const items = Object.values(getMergedRegistryIndex()).map(entryToNavItem);
  const bySection = new Map<string, RegistryNavItem[]>();

  for (const item of items) {
    const key = `${item.style}/${item.group}`;
    const existing = bySection.get(key);
    if (existing) {
      existing.push(item);
    } else {
      bySection.set(key, [item]);
    }
  }

  return Array.from(bySection.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, sectionItems]) => {
      const slash = key.indexOf("/");
      const style = key.slice(0, slash);
      const group = key.slice(slash + 1);
      return {
        style,
        group,
        items: [...sectionItems].sort((a, b) => a.title.localeCompare(b.title)),
      };
    });
}
