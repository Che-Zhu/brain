"use client";

import type {
  EnvironmentNodeAction,
  EnvironmentNodeLifecycleActions,
  EnvironmentNodeQuickActions,
  EnvironmentNodeStates,
} from "@workspace/ui/components/environment-node/environment-node";
import { EnvironmentNode } from "@workspace/ui/components/environment-node/environment-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";

import { EnvironmentNodeCanvasHero } from "./environment-node-preview.canvas";

const launchCommand = "pnpm dev --host 0.0.0.0 --port 3000";

const baseStates: EnvironmentNodeStates = {
  displayRuntime: "Node.js",
  formattedVersion: "20",
  metrics: {
    cpu: 24,
    memory: 42,
    storage: 31,
  },
  name: "alice-devbox",
  runtimeKey: "nodejs",
  status: { label: "Running", tone: "running" },
};

const statusSamples: {
  status: EnvironmentNodeStates["status"];
  title: string;
}[] = [
  { status: { label: "Running", tone: "running" }, title: "Running" },
  { status: { label: "Pending", tone: "pending" }, title: "Pending" },
  { status: { label: "Stopping", tone: "stopping" }, title: "Stopping" },
  { status: { label: "Failed", tone: "failed" }, title: "Failed" },
  { status: undefined, title: "Unknown" },
];

const quickActions = {
  ide: { onClick: () => undefined },
  logs: { onClick: () => undefined },
  metrics: { onClick: () => undefined },
  terminal: { onClick: () => undefined },
} satisfies EnvironmentNodeQuickActions;

const lifecycleActions = {
  delete: { onClick: () => undefined },
  restart: { onClick: () => undefined },
  start: { onClick: () => undefined },
  stop: { onClick: () => undefined },
} satisfies EnvironmentNodeLifecycleActions;

const loadingQuickActions = {
  ide: { onClick: () => undefined },
  logs: { loading: true, onClick: () => undefined },
  metrics: { onClick: () => undefined },
  terminal: { onClick: () => undefined },
} satisfies Record<string, EnvironmentNodeAction>;

const loadingLifecycleActions = {
  delete: { onClick: () => undefined },
  restart: { loading: true, onClick: () => undefined },
  start: { onClick: () => undefined },
  stop: { onClick: () => undefined },
} satisfies Record<string, EnvironmentNodeAction>;

const runtimeSamples = [
  { displayRuntime: "Node.js", formattedVersion: "20", runtimeKey: "nodejs" },
  { displayRuntime: "Go", formattedVersion: "1.23", runtimeKey: "go" },
  { displayRuntime: "Python", formattedVersion: "3.12", runtimeKey: "python" },
  { displayRuntime: "Java", formattedVersion: "21", runtimeKey: "java" },
  { displayRuntime: "Rust", formattedVersion: "1.82", runtimeKey: "rust" },
  { displayRuntime: "PHP", formattedVersion: "8.3", runtimeKey: "php" },
  { displayRuntime: "Ruby", formattedVersion: "3.3", runtimeKey: "ruby" },
  { displayRuntime: "C++", formattedVersion: "23", runtimeKey: "cpp" },
  { displayRuntime: ".NET", formattedVersion: "9", runtimeKey: "dotnet" },
  {
    displayRuntime: "Bun",
    formattedVersion: "1.3",
    runtimeKey: "bun",
  },
] as const;

function PreviewSurface({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-44 items-center justify-center overflow-hidden p-6">
      <div aria-hidden className="canvas-surface" />
      <div className="relative">{children}</div>
    </div>
  );
}

function EnvironmentNodeSample({
  copiedLaunchCommand,
  defaultExpanded = false,
  dragging,
  launchCommandValue = launchCommand,
  lifecycleActions: sampleLifecycleActions = lifecycleActions,
  quickActions: sampleQuickActions = quickActions,
  selected,
  states = baseStates,
}: {
  copiedLaunchCommand?: boolean;
  defaultExpanded?: boolean;
  dragging?: boolean;
  launchCommandValue?: string;
  lifecycleActions?: EnvironmentNodeLifecycleActions;
  quickActions?: EnvironmentNodeQuickActions;
  selected?: boolean;
  states?: EnvironmentNodeStates;
}) {
  return (
    <EnvironmentNode.Root
      copiedLaunchCommand={copiedLaunchCommand}
      defaultExpanded={defaultExpanded}
      interaction={{ dragging, selected }}
      launchCommand={launchCommandValue}
      lifecycleActions={sampleLifecycleActions}
      quickActions={sampleQuickActions}
      states={states}
    >
      <EnvironmentNode.Content />
    </EnvironmentNode.Root>
  );
}

export default function EnvironmentNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview
        className="h-96"
        containerClassName="lg:col-span-2"
        showMaximize
        title="In canvas"
      >
        <EnvironmentNodeCanvasHero />
      </Preview>
      <Preview title="Collapsed default">
        <PreviewSurface>
          <EnvironmentNodeSample />
        </PreviewSurface>
      </Preview>
      <Preview title="Collapsed selected">
        <PreviewSurface>
          <EnvironmentNodeSample selected />
        </PreviewSurface>
      </Preview>
      <Preview title="Expanded default">
        <PreviewSurface>
          <EnvironmentNodeSample defaultExpanded />
        </PreviewSurface>
      </Preview>
      <Preview title="Expanded selected">
        <PreviewSurface>
          <EnvironmentNodeSample defaultExpanded selected />
        </PreviewSurface>
      </Preview>
      <Preview title="Copied launch command">
        <PreviewSurface>
          <EnvironmentNodeSample copiedLaunchCommand defaultExpanded />
        </PreviewSurface>
      </Preview>
      <Preview title="Missing launch command">
        <PreviewSurface>
          <EnvironmentNodeSample defaultExpanded launchCommandValue="" />
        </PreviewSurface>
      </Preview>
      <Preview title="Action loading">
        <PreviewSurface>
          <EnvironmentNodeSample
            defaultExpanded
            lifecycleActions={loadingLifecycleActions}
            quickActions={loadingQuickActions}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Unknown status">
        <PreviewSurface>
          <EnvironmentNodeSample
            states={{
              ...baseStates,
              metrics: { cpu: 24 },
              name: "telemetry-pending",
              status: undefined,
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Fallback runtime icon">
        <PreviewSurface>
          <EnvironmentNodeSample
            states={{
              ...baseStates,
              displayRuntime: "Bun",
              formattedVersion: "1.3",
              name: "bun-sandbox",
              runtimeKey: "bun",
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview
        containerClassName="lg:col-span-2"
        title="Footer metric coverage"
      >
        <PreviewSurface>
          <div className="flex flex-wrap items-start gap-3">
            <EnvironmentNodeSample />
            <EnvironmentNodeSample
              states={{
                ...baseStates,
                metrics: { memory: "612 MiB" },
                name: "partial-metrics",
              }}
            />
            <EnvironmentNodeSample
              states={{
                ...baseStates,
                metrics: {},
                name: "unknown-state",
                status: { label: "Unknown", tone: "unknown" },
              }}
            />
          </div>
        </PreviewSurface>
      </Preview>
      <Preview containerClassName="lg:col-span-2" title="Runtime icon coverage">
        <PreviewSurface>
          <div className="flex flex-wrap items-start gap-3">
            {runtimeSamples.map((runtime) => (
              <EnvironmentNodeSample
                key={runtime.runtimeKey}
                states={{
                  ...baseStates,
                  displayRuntime: runtime.displayRuntime,
                  formattedVersion: runtime.formattedVersion,
                  name: `${runtime.runtimeKey}-workspace`,
                  runtimeKey: runtime.runtimeKey,
                }}
              />
            ))}
          </div>
        </PreviewSurface>
      </Preview>
      <Preview
        containerClassName="lg:col-span-2"
        title="Status adapter coverage"
      >
        <PreviewSurface>
          <div className="flex flex-wrap items-start gap-3">
            {statusSamples.map((sample) => (
              <div className="flex flex-col gap-2" key={sample.title}>
                <EnvironmentNodeSample
                  states={{
                    ...baseStates,
                    name: `workspace-${sample.title.toLowerCase()}`,
                    status: sample.status,
                  }}
                />
                <span className="text-muted-foreground text-xs">
                  {sample.title}
                </span>
              </div>
            ))}
          </div>
        </PreviewSurface>
      </Preview>
      <Preview title="Dragging state">
        <PreviewSurface>
          <EnvironmentNodeSample defaultExpanded dragging />
        </PreviewSurface>
      </Preview>
      <Preview title="Long values">
        <PreviewSurface>
          <EnvironmentNodeSample
            defaultExpanded
            launchCommandValue="docker compose --profile full-stack up --build --remove-orphans --watch"
            states={{
              ...baseStates,
              name: "frontend-observability-workspace-production",
            }}
          />
        </PreviewSurface>
      </Preview>
    </PreviewWrapper>
  );
}
