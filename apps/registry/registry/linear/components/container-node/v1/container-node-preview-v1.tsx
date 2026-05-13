"use client";

import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/v1/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/v1/container-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
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
const demoActions: ContainerNodeActions = {
  onDelete: () => undefined,
  onOpenShell: () => undefined,
  onPause: () => undefined,
  onRestart: () => undefined,
  onStart: () => undefined,
  onViewActivity: () => undefined,
  onViewCalendar: () => undefined,
  onViewLogs: () => undefined,
};

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
      <ContainerNode.Variant1
        actions={demoActions}
        className={shellClass}
        content={content}
        states={buildPreviewStates("running", step)}
      />
      <ContainerNode.Variant1
        actions={demoActions}
        className={shellClass}
        content={content}
        states={buildPreviewStates("failed", 0)}
      />
      <ContainerNode.Variant1
        actions={demoActions}
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
