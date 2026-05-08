"use client";

import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v1/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/v1/container-node";
import { containerNodeLifecycleMenuVisibility } from "@workspace/ui/components/container-node/v1/container-node.menu-visibility";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { Cpu, MemoryStick, Pause, Play, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

const staticBase = {
  image: "registry.example.io/demo:v2",
  kind: "Container",
  name: "workload-demo-001",
  replicas: 3,
} as const;

/** Same length; consecutive duplicates → FlashNumber stays calm on that tick. */
const RUN_CPU_STEPS = [12, 18, 23, 23, 40, 55, 55, 62, 70, 70, 78] as const;
const RUN_MEM_STEPS = [28, 35, 45, 45, 52, 60, 60, 68, 75, 75, 82] as const;

type PreviewStatusVariant = "failed" | "paused" | "running";

function previewNameSuffix(variant: PreviewStatusVariant): string {
  if (variant === "running") {
    return "running";
  }
  if (variant === "failed") {
    return "failed";
  }
  return "paused";
}

function buildPreviewStates(
  variant: PreviewStatusVariant,
  liveStep: number
): ContainerNodeStates {
  const base = {
    ...staticBase,
    name: `${staticBase.name}-${previewNameSuffix(variant)}`,
  };
  if (variant === "running") {
    return {
      ...base,
      cpuPercent: RUN_CPU_STEPS[liveStep],
      memoryPercent: RUN_MEM_STEPS[liveStep],
      status: { label: "Running", tone: "running" },
    };
  }
  if (variant === "failed") {
    return {
      ...base,
      cpuPercent: undefined,
      memoryPercent: undefined,
      replicas: 0,
      status: { label: "Failed", tone: "failed" },
    };
  }
  return {
    ...base,
    cpuPercent: undefined,
    memoryPercent: undefined,
    replicas: 1,
    status: { label: "Paused", tone: "paused" },
  };
}

/** Stub handlers — same pattern as `Chat.Export onExport={() => undefined}`. */
const demoActions = {
  onDelete: () => undefined,
  onOpenShell: () => undefined,
  onPause: () => undefined,
  onRestart: () => undefined,
  onStart: () => undefined,
  onViewActivity: () => undefined,
  onViewCalendar: () => undefined,
  onViewLogs: () => undefined,
} as const;

/**
 * v1 node: `Shell` → `Header` → optional `Content` → `Footer`.
 */
function V1WorkloadCard({
  className,
  content = "full",
  states,
}: {
  className?: string;
  content?: "collapsed" | "full";
  states: ContainerNodeStates;
}) {
  const { showPause, showRestart, showStart } =
    containerNodeLifecycleMenuVisibility(states.status?.tone);

  return (
    <ContainerNode.Shell className={className}>
      <ContainerNode.Header>
        <ContainerNode.HeaderMain>
          <ContainerNode.IconPlaceholder />
          <ContainerNode.HeaderTitles>
            <ContainerNode.Title name={states.name} />
            <ContainerNode.Kind kind={states.kind} />
          </ContainerNode.HeaderTitles>
        </ContainerNode.HeaderMain>
        <ContainerNode.HeaderMenuDropdown>
          <ContainerNode.HeaderMenuTrigger />
          <ContainerNode.HeaderMenuContent>
            {showStart ? (
              <ContainerNode.HeaderMenuItem
                accentHover="positive"
                disabled={demoActions.onStart == null}
                icon={<Play className="size-3.5 shrink-0 opacity-80" />}
                onClick={() => demoActions.onStart()}
              >
                Start
              </ContainerNode.HeaderMenuItem>
            ) : null}
            {showPause ? (
              <ContainerNode.HeaderMenuItem
                disabled={demoActions.onPause == null}
                icon={<Pause className="size-3.5 shrink-0 opacity-80" />}
                onClick={() => demoActions.onPause()}
              >
                Pause
              </ContainerNode.HeaderMenuItem>
            ) : null}
            {showRestart ? (
              <ContainerNode.HeaderMenuItem
                accentHover="positive"
                disabled={demoActions.onRestart == null}
                icon={<RotateCw className="size-3.5 shrink-0 opacity-80" />}
                onClick={() => demoActions.onRestart()}
              >
                Restart
              </ContainerNode.HeaderMenuItem>
            ) : null}
            <ContainerNode.HeaderMenuDelete
              name={states.name}
              onConfirmDelete={demoActions.onDelete}
            />
          </ContainerNode.HeaderMenuContent>
        </ContainerNode.HeaderMenuDropdown>
      </ContainerNode.Header>
      {content === "full" ? (
        <ContainerNode.Content className="gap-2">
          <ContainerNode.Image image={states.image} />
          <div className="nodrag nopan flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1">
            <ContainerNode.ToolbarActivity
              onViewActivity={demoActions.onViewActivity}
            />
            <ContainerNode.ToolbarShell onOpenShell={demoActions.onOpenShell} />
            <ContainerNode.ToolbarLogs onViewLogs={demoActions.onViewLogs} />
            <ContainerNode.ToolbarCalendar
              onViewCalendar={demoActions.onViewCalendar}
            />
          </div>
        </ContainerNode.Content>
      ) : null}
      <ContainerNode.Footer>
        <ContainerNode.Status
          label={states.status?.label}
          tone={states.status?.tone}
        />
        <ContainerNode.ResourceGroup>
          <ContainerNode.Resource icon={Cpu} percent={states.cpuPercent} />
          <ContainerNode.Resource
            icon={MemoryStick}
            percent={states.memoryPercent}
          />
          <ContainerNode.Replicas replicas={states.replicas} />
        </ContainerNode.ResourceGroup>
      </ContainerNode.Footer>
    </ContainerNode.Shell>
  );
}

function StatusVariantRows({ content }: { content: "collapsed" | "full" }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % RUN_CPU_STEPS.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const shellClass = content === "full" ? "min-h-40 w-60" : "w-60";

  return (
    <div className="flex flex-wrap items-start justify-center gap-8">
      <V1WorkloadCard
        className={shellClass}
        content={content}
        states={buildPreviewStates("running", step)}
      />
      <V1WorkloadCard
        className={shellClass}
        content={content}
        states={buildPreviewStates("failed", 0)}
      />
      <V1WorkloadCard
        className={shellClass}
        content={content}
        states={buildPreviewStates("paused", 0)}
      />
    </div>
  );
}

export default function ContainerNodePreviewV1() {
  return (
    <PreviewWrapper className="gap-10">
      <Preview title="Expanded — running (live usage) · failed · paused">
        <StatusVariantRows content="full" />
      </Preview>
      <Preview title="Collapsed (header + footer only) — running · failed · paused">
        <StatusVariantRows content="collapsed" />
      </Preview>
    </PreviewWrapper>
  );
}
