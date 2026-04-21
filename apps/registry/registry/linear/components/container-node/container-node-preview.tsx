"use client";

import type { CrossplaneServiceStatusPhase } from "@workspace/crossplane/lib/status";
import type { ContainerNodeStates } from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
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

/** Non-running phases: no CPU/memory (workload not live / no meaningful usage). */
const statusDemos: {
  label: string;
  title: string;
  tone: CrossplaneServiceStatusPhase;
  replicas: number;
}[] = [
  {
    title: "Yellow — pending (no usage yet)",
    label: "Pending",
    tone: "pending",
    replicas: 1,
  },
  {
    title: "Purple — stopped (paused)",
    label: "Stopped",
    tone: "stopped",
    replicas: 0,
  },
  {
    title: "Red — failed (errored)",
    label: "Failed",
    tone: "failed",
    replicas: 0,
  },
];

export default function ContainerNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Green — running (live usage, shifts every 2s)">
        <RunningWorkloadPreview className="min-h-40 max-w-60" />
      </Preview>
      {statusDemos.map((item) => (
        <Preview key={item.tone} title={item.title}>
          <ContainerNode.Root
            states={{
              ...staticBase,
              name: `${staticBase.name}-${item.tone}`,
              replicas: item.replicas,
              status: { label: item.label, tone: item.tone },
            }}
          >
            <ContainerNode.Variant0 className="min-h-40 max-w-60" />
          </ContainerNode.Root>
        </Preview>
      ))}
      <Preview title="Collapsed (running)">
        <ContainerNode.Root
          states={{
            ...staticBase,
            collapsed: true,
            cpuPercent: 42,
            memoryPercent: 55,
            status: { label: "Running", tone: "running" },
          }}
        >
          <ContainerNode.Variant0 className="max-w-60" />
        </ContainerNode.Root>
      </Preview>
      <Preview title="Unknown metrics / status">
        <ContainerNode.Root
          states={{
            image: "registry.example.io/demo:v2",
            kind: "Container",
            name: "workload-metrics-pending",
          }}
        >
          <ContainerNode.Variant0 className="min-h-40 max-w-60" />
        </ContainerNode.Root>
      </Preview>
    </PreviewWrapper>
  );
}
