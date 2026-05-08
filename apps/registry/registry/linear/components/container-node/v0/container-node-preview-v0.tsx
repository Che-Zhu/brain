"use client";

import type { ContainerNodeStates } from "@workspace/ui/components/container-node/v0/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/v0/container-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { useEffect, useMemo, useState } from "react";

const staticBase = {
  image: "registry.example.io/demo:v2",
  kind: "Container",
  name: "workload-demo-001",
  replicas: 3,
} as const;

/** Same length; consecutive duplicates → FlashNumber stays calm on that tick. */
const RUN_CPU_STEPS = [12, 18, 23, 23, 40, 55, 55, 62, 70, 70, 78] as const;
const RUN_MEM_STEPS = [28, 35, 45, 45, 52, 60, 60, 68, 75, 75, 82] as const;

function RunningWorkloadPreview({ className }: { className?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % RUN_CPU_STEPS.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const states: ContainerNodeStates = {
    ...staticBase,
    cpuPercent: RUN_CPU_STEPS[step],
    memoryPercent: RUN_MEM_STEPS[step],
    status: { label: "Running", tone: "running" },
  };

  return (
    <ContainerNode.Root states={states}>
      <ContainerNode.Variant0 className={className} />
    </ContainerNode.Root>
  );
}

function DeleteDialogPreview() {
  return (
    <div className="flex min-h-48 items-center justify-center p-4">
      <ContainerNode.DeleteDialogPanel
        name="workload-demo-001"
        onCancel={() => undefined}
        onConfirmDelete={() => undefined}
      />
    </div>
  );
}

function ScaleDialogPreview() {
  const [replicas, setReplicas] = useState(3);
  const [draft, setDraft] = useState(replicas);
  const max = useMemo(
    () => Math.max(20, replicas, draft, 1),
    [draft, replicas]
  );

  useEffect(() => {
    setDraft(replicas);
  }, [replicas]);

  return (
    <div className="flex min-h-48 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-background ring-1 ring-foreground/10">
        <ContainerNode.ScaleDialogPanel
          draft={draft}
          max={max}
          onDraftChange={setDraft}
          onScale={(n) => setReplicas(n)}
        />
      </div>
    </div>
  );
}

export default function ContainerNodePreviewV0() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview
        containerClassName="lg:col-span-2"
        title="Green — running (live usage, shifts every 2s) · Red — failed (errored)"
      >
        <div className="flex flex-wrap items-start justify-center gap-8">
          <RunningWorkloadPreview className="min-h-40 max-w-60" />
          <ContainerNode.Root
            states={{
              ...staticBase,
              name: `${staticBase.name}-failed`,
              replicas: 0,
              status: { label: "Failed", tone: "failed" },
            }}
          >
            <ContainerNode.Variant0 className="min-h-40 max-w-60" />
          </ContainerNode.Root>
        </div>
      </Preview>
      <Preview title="Delete dialog">
        <DeleteDialogPreview />
      </Preview>
      <Preview title="Scale dialog">
        <ScaleDialogPreview />
      </Preview>
    </PreviewWrapper>
  );
}
