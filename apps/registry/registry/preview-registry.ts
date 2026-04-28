import type { ComponentType } from "react";

import type { RegistryPreviewState } from "./nav-types";

export interface RegistryFile {
  path: string;
  target: string;
  type: string;
}

export type RegistryPreviewLoader = () => Promise<{ default: ComponentType }>;

/** One implementation of a preview (e.g. `v0` / `v1` folders). */
export interface RegistryPreviewVariant {
  id: string;
  load: RegistryPreviewLoader;
  title: string;
}

/**
 * One preview entry. Register new previews only here: metadata + `load` or `variants`.
 * Object key must equal `\`${style}/${group}/${name}\`` (same as URL under `/registry/`).
 */
export interface RegistryPreviewItem {
  description: string;
  files: RegistryFile[];
  group: string;
  /** Single implementation (most entries). */
  load?: RegistryPreviewLoader;
  name: string;
  registryDependencies: string[];
  state: RegistryPreviewState;
  style: string;
  title: string;
  type: "registry:preview";
  /**
   * Multiple implementations; workspace shows a variant menu when length > 1.
   * Order oldest → newest; the **last** entry is the default selection.
   */
  variants?: RegistryPreviewVariant[];
}

export type RegistryIndex = Record<string, RegistryPreviewItem>;

const previewUiFile: RegistryFile = {
  path: "packages/ui/src/components/preview.tsx",
  target: "",
  type: "registry:ui",
};

function getPreviewVariantsForItem(
  item: RegistryPreviewItem
): RegistryPreviewVariant[] {
  if (item.variants && item.variants.length > 0) {
    return item.variants;
  }
  if (item.load) {
    return [{ id: "default", load: item.load, title: "Default" }];
  }
  throw new Error(
    `Registry preview ${item.style}/${item.group}/${item.name} has neither load nor variants`
  );
}

function getRegistryPreviewVariantsForKey(
  key: string
): RegistryPreviewVariant[] {
  const item = Index[key];
  if (!item) {
    return [];
  }
  return getPreviewVariantsForItem(item);
}

/** Labels for the variant switcher (no loaders). */
export function getRegistryPreviewVariantOptions(
  key: string
): { id: string; title: string }[] {
  return getRegistryPreviewVariantsForKey(key).map(({ id, title }) => ({
    id,
    title,
  }));
}

export function getRegistryPreviewLoaderByKey(
  key: string,
  variantId?: string | null
): RegistryPreviewLoader | undefined {
  const item = Index[key];
  if (!item) {
    return undefined;
  }
  const variants = getPreviewVariantsForItem(item);
  const newest = variants.at(-1);
  if (!newest) {
    return undefined;
  }
  const newestId = newest.id;
  const resolved =
    variantId && variants.some((v) => v.id === variantId)
      ? variantId
      : newestId;
  return variants.find((v) => v.id === resolved)?.load;
}

export const Index: RegistryIndex = {
  "linear/components/log-viewer": {
    style: "linear",
    group: "components",
    name: "log-viewer",
    title: "Log Viewer",
    description: "Virtualized log list with filters, time range, and chart",
    state: "done",
    type: "registry:preview",
    registryDependencies: [
      "button",
      "badge",
      "calendar",
      "chart",
      "command",
      "preview",
      "input-group",
      "popover",
      "tooltip",
    ],
    files: [
      {
        path: "registry/linear/components/log-viewer/log-viewer-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import("@registry/linear/components/log-viewer/log-viewer-preview"),
  },

  "linear/components/container-node": {
    style: "linear",
    group: "components",
    name: "container-node",
    title: "Container Node",
    description:
      "Container node: Variant0 + standalone DeleteDialog / ScaleDialog previews; Root uses states/actions context.",
    state: "done",
    type: "registry:preview",
    registryDependencies: [
      "preview",
      "button",
      "dropdown-menu",
      "alert-dialog",
      "scale-slider",
    ],
    files: [
      {
        path: "registry/linear/components/container-node/container-node-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import(
        "@registry/linear/components/container-node/container-node-preview"
      ),
  },

  "linear/components/entry-node": {
    style: "linear",
    group: "components",
    name: "entry-node",
    title: "Entry Node",
    description:
      "Collapsed entry node status badge with local status colours and expand affordance.",
    state: "done",
    type: "registry:preview",
    registryDependencies: ["preview"],
    files: [
      {
        path: "registry/linear/components/entry-node/entry-node-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import("@registry/linear/components/entry-node/entry-node-preview"),
  },

  "linear/components/project-explorer": {
    style: "linear",
    group: "components",
    name: "project-explorer",
    title: "Project Explorer",
    description:
      "Projects sidebar-style list: header and rows with name and created date",
    state: "coding",
    type: "registry:preview",
    registryDependencies: ["preview"],
    files: [
      {
        path: "registry/linear/components/project-explorer/project-explorer-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import(
        "@registry/linear/components/project-explorer/project-explorer-preview"
      ),
  },

  "linear/components/scale-slider": {
    style: "linear",
    group: "components",
    name: "scale-slider",
    title: "Scale slider",
    description:
      "Stack + Header (Label + fixed NumberFlow) above Control; thumb has no label. Optional valueDisplay number (replicas) or percent.",
    state: "coding",
    type: "registry:preview",
    registryDependencies: ["preview"],
    files: [
      {
        path: "registry/linear/components/scale-slider/scale-slider-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import("@registry/linear/components/scale-slider/scale-slider-preview"),
  },

  "linear/components/canvas": {
    style: "linear",
    group: "components",
    name: "canvas",
    title: "Canvas",
    description:
      "React Flow workspace surface (dots, glow), Jotai, provider context",
    state: "coding",
    type: "registry:preview",
    registryDependencies: ["preview", "button", "container-node", "entry-node"],
    files: [
      {
        path: "registry/linear/components/canvas/canvas-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/linear/components/canvas/canvas-preview"),
  },

  "shadcn/components/accordion": {
    style: "shadcn",
    group: "components",
    name: "accordion",
    title: "Accordion",
    description: "Collapsible sections for FAQs and structured content",
    state: "designing",
    type: "registry:preview",
    registryDependencies: ["preview", "accordion", "button", "card"],
    files: [
      {
        path: "registry/shadcn/components/accordion-example.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/shadcn/components/accordion-example"),
  },
  "shadcn/components/alert-dialog": {
    style: "shadcn",
    group: "components",
    name: "alert-dialog",
    title: "Alert Dialog",
    description: "Modal confirmations and destructive actions",
    state: "reviewing",
    type: "registry:preview",
    registryDependencies: ["preview", "alert-dialog", "button", "dialog"],
    files: [
      {
        path: "registry/shadcn/components/alert-dialog-example/v0/alert-dialog-example-v0.tsx",
        type: "registry:preview",
        target: "",
      },
      {
        path: "registry/shadcn/components/alert-dialog-example/v1/alert-dialog-example-v1.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    variants: [
      {
        id: "v0",
        load: () =>
          import(
            "@registry/shadcn/components/alert-dialog-example/v0/alert-dialog-example-v0"
          ),
        title: "v0",
      },
      {
        id: "v1",
        load: () =>
          import(
            "@registry/shadcn/components/alert-dialog-example/v1/alert-dialog-example-v1"
          ),
        title: "v1",
      },
    ],
  },
  "shadcn/components/alert": {
    style: "shadcn",
    group: "components",
    name: "alert",
    title: "Alert",
    description: "Status messages with optional icons and actions",
    state: "coding",
    type: "registry:preview",
    registryDependencies: ["preview", "alert", "badge", "button"],
    files: [
      {
        path: "registry/shadcn/components/alert-example.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/shadcn/components/alert-example"),
  },
  "shadcn/components/avatar": {
    style: "shadcn",
    group: "components",
    name: "avatar",
    title: "Avatar",
    description: "User images, fallbacks, badges, and stacked groups",
    state: "done",
    type: "registry:preview",
    registryDependencies: ["preview", "avatar", "button", "empty"],
    files: [
      {
        path: "registry/shadcn/components/avatar-example.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/shadcn/components/avatar-example"),
  },
};
