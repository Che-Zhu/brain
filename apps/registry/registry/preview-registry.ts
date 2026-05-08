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
      "Container node: v0 Root+context+Variant0; v1 compose `Shell` (no Root), Header, Content, Footer + explicit props per piece.",
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
        path: "registry/linear/components/container-node/v0/container-node-preview-v0.tsx",
        type: "registry:preview",
        target: "",
      },
      {
        path: "registry/linear/components/container-node/v1/container-node-preview-v1.tsx",
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
            "@registry/linear/components/container-node/v0/container-node-preview-v0"
          ),
        title: "v0",
      },
      {
        id: "v1",
        load: () =>
          import(
            "@registry/linear/components/container-node/v1/container-node-preview-v1"
          ),
        title: "v1",
      },
    ],
  },

  "linear/components/chat": {
    style: "linear",
    group: "components",
    name: "chat",
    title: "Chat",
    description:
      "Chat workspace: optional Chat.Root shell; compose Header, Transcript, and Composer pieces with explicit props; AI SDK message list",
    state: "done",
    type: "registry:preview",
    registryDependencies: [
      "preview",
      "button",
      "breadcrumb",
      "dropdown-menu",
      "textarea",
      "spinner",
    ],
    files: [
      {
        path: "registry/linear/components/chat/chat-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/linear/components/chat/chat-preview"),
  },

  "linear/components/github-deployer": {
    style: "linear",
    group: "components",
    name: "github-deployer",
    title: "GitHub deployer",
    description:
      "OAuth auth control (same UX as app sidebar) + repo Select; Root states/actions align with useGithubAuth",
    state: "coding",
    type: "registry:preview",
    registryDependencies: ["preview", "button", "select", "tooltip"],
    files: [
      {
        path: "registry/linear/components/github-deployer/github-deployer-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import(
        "@registry/linear/components/github-deployer/github-deployer-preview"
      ),
  },

  "linear/components/mdx": {
    style: "linear",
    group: "components",
    name: "mdx",
    title: "MDX / Markdown",
    description:
      "MessageResponse + shared markdownComponents (Streamdown): typography, lists, tables, Shiki-backed code blocks",
    state: "done",
    type: "registry:preview",
    registryDependencies: ["preview"],
    files: [
      {
        path: "registry/linear/components/mdx/mdx-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/linear/components/mdx/mdx-preview"),
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
    state: "done",
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
    registryDependencies: ["preview", "button", "container-node"],
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

  "linear/components/metrics-chart": {
    style: "linear",
    group: "components",
    name: "metrics-chart",
    title: "Metrics chart",
    description:
      "Multi-series metrics area chart: MetricsChart.Root + Area compound API, MetricsChartProvider, useMetricsChart; Variant0 / Variant1",
    state: "done",
    type: "registry:preview",
    registryDependencies: ["preview", "chart"],
    files: [
      {
        path: "registry/linear/components/metrics-chart/metrics-chart-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () =>
      import("@registry/linear/components/metrics-chart/metrics-chart-preview"),
  },

  "linear/components/agui": {
    style: "linear",
    group: "components",
    name: "agui",
    title: "AGUI",
    description:
      "json-render MetricsChart: catalog + registry from @workspace/ui, dummy spec for local preview",
    state: "done",
    type: "registry:preview",
    registryDependencies: ["preview", "chart"],
    files: [
      {
        path: "registry/linear/components/agui/agui-preview.tsx",
        type: "registry:preview",
        target: "",
      },
      previewUiFile,
    ],
    load: () => import("@registry/linear/components/agui/agui-preview"),
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
