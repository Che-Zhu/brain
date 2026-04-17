"use client";

import { Preview, PreviewWrapper } from "@shadcn/ui/preview";
import type { CrossplaneServiceStatusPhase } from "@workspace/crossplane/schemas";
import { ContainerNode } from "./container-node";

const baseStates = {
  cpuPercent: 42,
  image: "registry.example.io/demo:v2",
  kind: "Container",
  memoryPercent: 55,
  name: "workload-demo-001",
  replicas: 3,
} as const;

/** One representative phase per theme color (green / yellow / purple / red). */
const statusDemos: {
  label: string;
  title: string;
  tone: CrossplaneServiceStatusPhase;
}[] = [
  { title: "Green — healthy", label: "Running", tone: "running" },
  { title: "Yellow — in progress", label: "Pending", tone: "pending" },
  { title: "Purple — stopped", label: "Stopped", tone: "stopped" },
  { title: "Red — error", label: "Failed", tone: "failed" },
];

export default function ContainerNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      {statusDemos.map((item) => (
        <Preview key={item.tone} title={item.title}>
          <ContainerNode.Root
            states={{
              ...baseStates,
              status: { label: item.label, tone: item.tone },
            }}
          >
            <ContainerNode.Variant0 className="min-h-40 max-w-60" />
          </ContainerNode.Root>
        </Preview>
      ))}
    </PreviewWrapper>
  );
}
