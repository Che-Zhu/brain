"use client";

import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/vercel-tabs";
import { cn } from "@workspace/ui/lib/utils";
import type { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import type {
  CanvasMeta,
  CanvasPanelBodyProps,
  CanvasPanelProps,
  CanvasPanelTab,
} from "./canvas.types";
import { useCanvasUpperRightContent } from "./canvas.upper-right";
import { useCanvas } from "./canvas.use";

const DEFAULT_KIND_LABEL = "Container";

const panelScrollFallbackClass = "flex min-h-0 flex-1 flex-col overflow-y-auto";

const tabContentClassName =
  "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none";

function panelHeadingFromNode(selected: Node): { kind: string; title: string } {
  if (
    selected.type === "containerNode" &&
    selected.data !== null &&
    typeof selected.data === "object" &&
    "states" in selected.data
  ) {
    const states = (
      selected.data as { states?: { kind?: string; name?: string } }
    ).states;
    if (states?.name != null && states.name !== "") {
      return {
        kind: states.kind ?? DEFAULT_KIND_LABEL,
        title: states.name,
      };
    }
  }
  return {
    kind:
      selected.type != null && selected.type !== ""
        ? selected.type
        : DEFAULT_KIND_LABEL,
    title: selected.id,
  };
}

function nonEmptyTabs(
  meta: CanvasMeta,
  nodeType: string | null | undefined
): CanvasPanelTab[] | null {
  if (nodeType == null) {
    return null;
  }
  const tabs = meta.panelTabs?.[nodeType];
  return tabs != null && tabs.length > 0 ? tabs : null;
}

/** Resolve a sync value to a valid tab name, falling back to the first tab. */
function resolveTabValue(
  syncValue: string | undefined,
  tabItems: CanvasPanelTab[]
): string {
  const first = tabItems[0]?.name ?? "";
  const v = syncValue?.trim() ?? "";
  if (v !== "" && tabItems.some((t) => t.name === v)) {
    return v;
  }
  return first;
}

function panelTabMount(
  tab: CanvasPanelTab,
  panel: CanvasPanelBodyProps
): ReactNode {
  return "render" in tab && typeof tab.render === "function"
    ? tab.render(panel)
    : tab.component;
}

export function CanvasPanel({ children, className }: CanvasPanelProps) {
  const { actions, meta, state } = useCanvas();
  const upperRight = useCanvasUpperRightContent();

  if (state.selectedNode == null) {
    return null;
  }

  const selected = state.selectedNode;
  const heading = panelHeadingFromNode(selected);
  const tabItems = nonEmptyTabs(meta, selected.type);
  const PanelBody =
    selected.type == null ? undefined : meta.panelTypes?.[selected.type];
  const panelProps: CanvasPanelBodyProps = { node: selected };

  const panelContent =
    tabItems == null ? (
      <div className={panelScrollFallbackClass}>
        {PanelBody == null ? children : <PanelBody node={selected} />}
      </div>
    ) : (
      <CanvasPanelTabs meta={meta} panelProps={panelProps} tabItems={tabItems} />
    );

  return (
    <aside
      className={cn(
        "canvas-panel pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-full min-w-0 flex-col bg-background/95 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <CanvasPanelHeader
        heading={heading}
        onClose={actions.onPanelClose}
        upperRight={upperRight}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {panelContent}
      </div>
    </aside>
  );
}

CanvasPanel.displayName = "CanvasPanel";

function CanvasPanelTabs({
  meta,
  tabItems,
  panelProps,
}: {
  meta: CanvasMeta;
  panelProps: CanvasPanelBodyProps;
  tabItems: CanvasPanelTab[];
}) {
  const sync = meta.panelTabSync;
  const value = resolveTabValue(sync?.tabValue, tabItems);

  useEffect(() => {
    if (sync != null && value !== sync.tabValue) {
      Promise.resolve(sync.setTabValue(value)).catch(() => undefined);
    }
  }, [sync, value]);

  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col"
      key={sync == null ? panelProps.node.id : undefined}
      {...(sync == null
        ? { defaultValue: tabItems[0]?.name ?? "" }
        : {
            onValueChange: (next: string) => {
              Promise.resolve(sync.setTabValue(next)).catch(() => undefined);
            },
            value,
          })}
    >
      <TabsList aria-label="Panel sections" className="shrink-0 flex-wrap">
        {tabItems.map((tab) => (
          <TabsTrigger key={`${panelProps.node.id}:${tab.name}`} value={tab.name}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabItems.map((tab) => (
        <TabsContent
          className={tabContentClassName}
          key={`${panelProps.node.id}:${tab.name}:body`}
          value={tab.name}
        >
          {panelTabMount(tab, panelProps)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

CanvasPanelTabs.displayName = "CanvasPanelTabs";

function CanvasPanelHeader({
  heading,
  upperRight,
  onClose,
}: {
  heading: { kind: string; title: string };
  upperRight: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 flex-row flex-wrap items-center gap-2 border-border/60 border-b p-2">
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
        <div
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-foreground/10"
        >
          <HugeiconsIcon
            aria-hidden
            className="text-muted-foreground"
            icon={ThreeDViewIcon}
            size={24}
            strokeWidth={2}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="min-w-0 max-w-full truncate font-medium text-xs leading-tight">
            {heading.title}
          </div>
          <div className="min-w-0 max-w-full truncate text-[10px] text-muted-foreground">
            {heading.kind}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          aria-label="Close panel"
          className="hoverable size-7 shrink-0"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
        </Button>
        {upperRight}
      </div>
    </header>
  );
}
