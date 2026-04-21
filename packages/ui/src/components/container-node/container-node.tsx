"use client";

import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type CrossplaneServiceStatusPhase,
  getStatusIndicatorClass,
  getStatusTextClass,
} from "@workspace/crossplane/lib/status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Cpu, Layers, MemoryStick, MoreHorizontal } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

const ContainerNodeContext = createContext<ContainerNodeValue | null>(null);

/** Service phase; aligns with Crossplane/Kubernetes-style statuses and theme tones. */
export type ContainerNodeStatusTone = CrossplaneServiceStatusPhase;

/** Display state for a container node (passed into Root as `states`). */
export interface ContainerNodeStates {
  /** When true, only header + footer show; image section and resource metrics are hidden. */
  collapsed?: boolean;
  cpuPercent?: number;
  image: string;
  kind?: string;
  memoryPercent?: number;
  name: string;
  replicas?: number;
  status?: {
    label: string;
    tone: ContainerNodeStatusTone;
  };
}

/** Optional handlers wired from the default header menu. */
export interface ContainerNodeActions {
  onDelete?: () => void;
  onOpenShell?: () => void;
  onRestart?: () => void;
  onScale?: () => void;
  onViewLogs?: () => void;
}

export interface ContainerNodeValue {
  actions: ContainerNodeActions;
  states: ContainerNodeStates;
}

export function useContainerNode(): ContainerNodeValue {
  const value = useContext(ContainerNodeContext);
  if (!value) {
    throw new Error(
      "ContainerNode: useContainerNode must be used within ContainerNode.Root"
    );
  }
  return value;
}

function ContainerNodeShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background-secondary text-card-foreground text-xs shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function ContainerNodeHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-row flex-wrap items-center gap-2 border-border/60 border-b px-3 py-2",
        className
      )}
      {...props}
    />
  );
}

function ContainerNodeContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col px-3 py-2", className)}
      {...props}
    />
  );
}

function ContainerNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 flex-row items-center justify-between gap-3 border-border/60 border-t px-3 py-2",
        className
      )}
      {...props}
    />
  );
}

/** Cluster CPU / memory (or other) resource rows and pin them to the end of the footer (opposite status). */
function ContainerNodeResourceGroup({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center justify-end gap-3 whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

function ContainerNodeTitle({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ctx = useContext(ContainerNodeContext);
  const content = children ?? ctx?.states.name;
  if (content == null) {
    return null;
  }
  return (
    <div
      className={cn(
        "min-w-0 max-w-full truncate font-medium text-xs leading-tight",
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
}

const DEFAULT_KIND = "Container";

function ContainerNodeKind({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ctx = useContext(ContainerNodeContext);
  const content = children ?? (ctx ? (ctx.states.kind ?? DEFAULT_KIND) : null);
  if (content == null) {
    return null;
  }
  return (
    <div
      className={cn(
        "min-w-0 max-w-full truncate text-[10px] text-muted-foreground",
        className
      )}
      {...props}
    >
      {content}
    </div>
  );
}

function ContainerNodeStatus({
  className,
  label: labelProp,
  tone: toneProp,
}: {
  className?: string;
  label?: string;
  tone?: ContainerNodeStatusTone;
}) {
  const ctx = useContext(ContainerNodeContext);
  const label = labelProp ?? ctx?.states.status?.label ?? "unknown";
  const tone = toneProp ?? ctx?.states.status?.tone;

  if (tone == null) {
    return (
      <div
        className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}
      >
        <span aria-hidden className="relative flex size-2 shrink-0">
          <span className="relative inline-flex size-2 shrink-0 rounded-[2px] bg-muted" />
        </span>
        <span className="truncate whitespace-nowrap font-medium text-muted-foreground text-xs">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <span aria-hidden className="relative flex size-2 shrink-0">
        <span
          className={cn(
            "absolute inset-0 inline-flex animate-ping rounded-[2px] opacity-75",
            getStatusIndicatorClass(tone)
          )}
        />
        <span
          className={cn(
            "relative inline-flex size-2 shrink-0 rounded-[2px]",
            getStatusIndicatorClass(tone)
          )}
        />
      </span>
      <span
        className={cn(
          "truncate whitespace-nowrap font-medium text-xs",
          getStatusTextClass(tone)
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ContainerNodeResource({
  className,
  icon: Icon,
  percent,
}: {
  className?: string;
  icon: LucideIcon;
  percent?: number;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Icon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      <span className="whitespace-nowrap tabular-nums">
        {percent == null ? "..." : `${percent}%`}
      </span>
    </div>
  );
}

/** Replica count from `states.replicas`, shown with a layers icon. */
function ContainerNodeReplicas({ className }: { className?: string }) {
  const {
    states: { replicas },
  } = useContainerNode();
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Layers aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      <span className="whitespace-nowrap text-xs tabular-nums">
        {replicas == null ? "..." : replicas}
      </span>
    </div>
  );
}

function ContainerNodeIconPlaceholder({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded bg-muted ring-1 ring-foreground/10",
        className
      )}
      {...props}
    >
      <HugeiconsIcon
        aria-hidden
        className="text-muted-foreground"
        icon={ThreeDViewIcon}
        size={24}
        strokeWidth={2}
      />
    </div>
  );
}

/** Read-only Docker / OCI image reference from context `states.image`. */
function ContainerNodeImage({
  className,
  label = "Image",
  labelClassName,
}: {
  className?: string;
  label?: string;
  labelClassName?: string;
}) {
  const {
    states: { image },
  } = useContainerNode();
  const display = image.trim() === "" ? "—" : image;
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-row items-start gap-2",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 pt-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide",
          labelClassName
        )}
      >
        {label}:
      </span>
      <p
        className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground leading-snug"
        title={display === "—" ? undefined : display}
      >
        {display}
      </p>
    </div>
  );
}

function ContainerNodeHeaderMenu({ menu }: { menu?: ReactNode }) {
  const { actions, states } = useContainerNode();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (menu != null) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open menu"
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl">
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open menu"
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl">
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onScale}
          >
            Scale
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onRestart}
          >
            Restart
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onViewLogs}
          >
            View logs
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={actions.onOpenShell}
          >
            Open shell
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl text-xs"
            onClick={() => setDeleteDialogOpen(true)}
            variant="destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{states.name}&quot;. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => {
                actions.onDelete?.();
                setDeleteDialogOpen(false);
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** First composed layout: shell + header / image / footer using primitives + context. */
function ContainerNodeVariant0({
  className,
}: ComponentProps<typeof ContainerNodeShell>) {
  const { states } = useContainerNode();
  const collapsed = states.collapsed === true;

  return (
    <ContainerNodeShell className={className}>
      <ContainerNodeHeader>
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
          <ContainerNodeIconPlaceholder />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ContainerNodeTitle />
            <ContainerNodeKind />
          </div>
        </div>
        <ContainerNodeHeaderMenu />
      </ContainerNodeHeader>
      {!collapsed && (
        <ContainerNodeContent>
          <ContainerNodeImage />
        </ContainerNodeContent>
      )}
      <ContainerNodeFooter>
        <ContainerNodeStatus />
        {!collapsed && (
          <ContainerNodeResourceGroup>
            <ContainerNodeResource icon={Cpu} percent={states.cpuPercent} />
            <ContainerNodeResource
              icon={MemoryStick}
              percent={states.memoryPercent}
            />
            <ContainerNodeReplicas />
          </ContainerNodeResourceGroup>
        )}
      </ContainerNodeFooter>
    </ContainerNodeShell>
  );
}

function ContainerNodeRoot({
  actions = {},
  children,
  states,
}: {
  actions?: ContainerNodeActions;
  children?: ReactNode;
  states: ContainerNodeStates;
}) {
  const value = useMemo(
    (): ContainerNodeValue => ({ actions, states }),
    [actions, states]
  );

  return (
    <ContainerNodeContext.Provider value={value}>
      {children}
    </ContainerNodeContext.Provider>
  );
}

export const ContainerNode = Object.assign(ContainerNodeShell, {
  Content: ContainerNodeContent,
  Context: ContainerNodeContext,
  Footer: ContainerNodeFooter,
  Header: ContainerNodeHeader,
  ResourceGroup: ContainerNodeResourceGroup,
  HeaderMenu: ContainerNodeHeaderMenu,
  IconPlaceholder: ContainerNodeIconPlaceholder,
  Image: ContainerNodeImage,
  Kind: ContainerNodeKind,
  Replicas: ContainerNodeReplicas,
  Resource: ContainerNodeResource,
  Root: ContainerNodeRoot,
  Shell: ContainerNodeShell,
  Status: ContainerNodeStatus,
  Title: ContainerNodeTitle,
  Variant0: ContainerNodeVariant0,
  useContainerNode,
});

ContainerNodeRoot.displayName = "ContainerNode.Root";
ContainerNodeVariant0.displayName = "ContainerNode.Variant0";
ContainerNodeShell.displayName = "ContainerNode.Shell";
ContainerNodeHeader.displayName = "ContainerNode.Header";
ContainerNodeContent.displayName = "ContainerNode.Content";
ContainerNodeFooter.displayName = "ContainerNode.Footer";
ContainerNodeResourceGroup.displayName = "ContainerNode.ResourceGroup";
ContainerNodeReplicas.displayName = "ContainerNode.Replicas";
