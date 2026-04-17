import type { RegistryNavItem, RegistrySidebarSection } from "./nav-types";

export function registryItemHref(
  item: Pick<RegistryNavItem, "style" | "group" | "name">
): string {
  return `/registry/${item.style}/${item.group}/${encodeURIComponent(item.name)}`;
}

/**
 * First item for a style in sidebar order: groups A→Z, first item per group
 * (items are title-sorted in `getRegistrySidebarSections`).
 */
export function firstRegistryItemHrefForStyle(
  sections: RegistrySidebarSection[],
  style: string
): string | null {
  const forStyle = sections
    .filter((s) => s.style === style)
    .sort((a, b) => a.group.localeCompare(b.group));
  const first = forStyle[0]?.items[0];
  return first ? registryItemHref(first) : null;
}
