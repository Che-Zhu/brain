"use client";

import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { ProjectFlow } from "@workspace/ui/components/project-flow/project-flow";
import { PROJECT_FLOW_NODE_TYPE_CONTAINER } from "@workspace/ui/components/project-flow/project-flow.nodes";

const workloadStates = {
  cpuPercent: 42,
  image: "registry.example.io/demo:v2",
  kind: "Container",
  memoryPercent: 55,
  name: "workload-demo-001",
  replicas: 3,
  status: { label: "Running", tone: "running" as const },
};

const initialNodes = [
  {
    id: "workload",
    type: PROJECT_FLOW_NODE_TYPE_CONTAINER,
    position: { x: 0, y: 0 },
    data: { states: workloadStates },
  },
];

export default function ProjectFlowPreview() {
  return (
    <PreviewWrapper className="flex flex-1 lg:grid-cols-1">
      <Preview className="flex-1" title="Project Flow">
        <ProjectFlow.Root
          states={{
            initialEdges: [],
            initialNodes: [...initialNodes],
          }}
        >
          <ProjectFlow.Variant0 className="flex-1" />
        </ProjectFlow.Root>
      </Preview>
    </PreviewWrapper>
  );
}
