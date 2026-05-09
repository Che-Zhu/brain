"use client";

import { Cpu, MemoryStick, Pause, Play, RotateCw } from "lucide-react";
import { useState } from "react";
import { ContainerNodeDeleteDialog } from "./container-node.delete-dialog";
import {
  ContainerNodeHeaderMenuContent,
  ContainerNodeHeaderMenuDelete,
  ContainerNodeHeaderMenuDropdown,
  ContainerNodeHeaderMenuItem,
  ContainerNodeHeaderMenuTrigger,
} from "./container-node.header-menu";
import {
  ContainerNodeToolbarActivity,
  ContainerNodeToolbarCalendar,
  ContainerNodeToolbarLogs,
  ContainerNodeToolbarShell,
} from "./container-node.icon-toolbar";
import {
  ContainerNodeContent,
  ContainerNodeFooter,
  ContainerNodeHeader,
  ContainerNodeHeaderMain,
  ContainerNodeHeaderTitles,
  ContainerNodeResourceGroup,
  ContainerNodeShell,
} from "./container-node.layout";
import { containerNodeLifecycleMenuVisibility } from "./container-node.menu-visibility";
import {
  ContainerNodeIconPlaceholder,
  ContainerNodeImage,
  ContainerNodeKind,
  ContainerNodeReplicas,
  ContainerNodeResource,
  ContainerNodeStatus,
  ContainerNodeTitle,
} from "./container-node.primitives";
import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "./container-node.types";

const DEFAULT_CONTENT_CLASS_NAME = "gap-2";

const DEFAULT_TOOLBAR_ROW_CLASS =
  "nodrag nopan flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1";

export interface ContainerNodeVariant1Props {
  actions?: ContainerNodeActions;
  className?: string;
  content?: "collapsed" | "full";
  /** Extra classes on `Content`; default `gap-2` between image and toolbar. */
  contentClassName?: string;
  states: ContainerNodeStates;
  /** Row under the image; default right-aligns toolbar icons (React Flow `nodrag`/`nopan`). */
  toolbarRowClassName?: string;
}

/**
 * Pre-composed v1 workload card: header menu (lifecycle-aware), optional content +
 * toolbar, footer metrics, and delete dialog (state lives outside dropdown).
 */
export function ContainerNodeVariant1({
  actions = {},
  className,
  content: contentMode = "full",
  contentClassName = DEFAULT_CONTENT_CLASS_NAME,
  states,
  toolbarRowClassName = DEFAULT_TOOLBAR_ROW_CLASS,
}: ContainerNodeVariant1Props) {
  const { showPause, showRestart, showStart } =
    containerNodeLifecycleMenuVisibility(states.status?.tone);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <ContainerNodeShell className={className}>
      <ContainerNodeHeader>
        <ContainerNodeHeaderMain>
          <ContainerNodeIconPlaceholder />
          <ContainerNodeHeaderTitles>
            <ContainerNodeTitle name={states.name} />
            <ContainerNodeKind kind={states.kind} />
          </ContainerNodeHeaderTitles>
        </ContainerNodeHeaderMain>
        <ContainerNodeHeaderMenuDropdown>
          <ContainerNodeHeaderMenuTrigger />
          <ContainerNodeHeaderMenuContent>
            {showStart ? (
              <ContainerNodeHeaderMenuItem
                accentHover="positive"
                disabled={actions.onStart == null}
                icon={Play}
                onClick={() => actions.onStart?.()}
              >
                Start
              </ContainerNodeHeaderMenuItem>
            ) : null}
            {showPause ? (
              <ContainerNodeHeaderMenuItem
                disabled={actions.onPause == null}
                icon={Pause}
                onClick={() => actions.onPause?.()}
              >
                Pause
              </ContainerNodeHeaderMenuItem>
            ) : null}
            {showRestart ? (
              <ContainerNodeHeaderMenuItem
                accentHover="positive"
                disabled={actions.onRestart == null}
                icon={RotateCw}
                onClick={() => actions.onRestart?.()}
              >
                Restart
              </ContainerNodeHeaderMenuItem>
            ) : null}
            <ContainerNodeHeaderMenuDelete
              onRequestDelete={() => setDeleteDialogOpen(true)}
            />
          </ContainerNodeHeaderMenuContent>
        </ContainerNodeHeaderMenuDropdown>
      </ContainerNodeHeader>
      {contentMode === "full" ? (
        <ContainerNodeContent className={contentClassName}>
          <ContainerNodeImage image={states.image} />
          <div className={toolbarRowClassName}>
            <ContainerNodeToolbarActivity
              onViewActivity={actions.onViewActivity}
            />
            <ContainerNodeToolbarShell onOpenShell={actions.onOpenShell} />
            <ContainerNodeToolbarLogs onViewLogs={actions.onViewLogs} />
            <ContainerNodeToolbarCalendar
              onViewCalendar={actions.onViewCalendar}
            />
          </div>
        </ContainerNodeContent>
      ) : null}
      <ContainerNodeFooter>
        <ContainerNodeStatus
          label={states.status?.label}
          tone={states.status?.tone}
        />
        <ContainerNodeResourceGroup>
          <ContainerNodeResource icon={Cpu} percent={states.cpuPercent} />
          <ContainerNodeResource
            icon={MemoryStick}
            percent={states.memoryPercent}
          />
          <ContainerNodeReplicas replicas={states.replicas} />
        </ContainerNodeResourceGroup>
      </ContainerNodeFooter>
      <ContainerNodeDeleteDialog
        name={states.name}
        onConfirmDelete={actions.onDelete}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
    </ContainerNodeShell>
  );
}
