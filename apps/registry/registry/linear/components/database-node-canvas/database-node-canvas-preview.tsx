"use client";

import { Canvas } from "@workspace/ui/components/canvas-alter/canvas";
import type { CanvasMeta } from "@workspace/ui/components/canvas-alter/canvas.types";
import type {
  DatabaseNodeConnection,
  DatabaseNodeStates,
} from "@workspace/ui/components/database-node/database-node";
import { DatabaseNode } from "@workspace/ui/components/database-node/database-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { Edge, Node, NodeProps, NodeTypes } from "@xyflow/react";
import { memo, useMemo } from "react";

interface CanvasDatabaseNodeData extends Record<string, unknown> {
  connections: DatabaseNodeConnection[];
  defaultExpanded?: boolean;
  states: DatabaseNodeStates;
}

const PreviewCanvasDatabaseNode = memo(function PreviewCanvasDatabaseNode({
  data,
  dragging,
  selected,
}: NodeProps<Node<CanvasDatabaseNodeData, "databaseNode">>) {
  return (
    <DatabaseNode.Root
      connections={data.connections}
      defaultExpanded={data.defaultExpanded}
      interaction={{ dragging, selected }}
      quickActions={{
        console: { onClick: () => undefined },
        logs: { onClick: () => undefined },
        metrics: { onClick: () => undefined },
      }}
      states={data.states}
    >
      <DatabaseNode.Content />
    </DatabaseNode.Root>
  );
});

PreviewCanvasDatabaseNode.displayName = "PreviewCanvasDatabaseNode";

const states: DatabaseNodeStates = {
  displayEngine: "PostgreSQL",
  engineKey: "postgresql",
  formattedVersion: "16.4",
  metrics: {
    cpu: 18,
    memory: 28,
    storage: 28,
  },
  name: "orders-api",
  status: { label: "Running", tone: "running" },
};

const connections: DatabaseNodeConnection[] = [
  {
    id: "private",
    kind: "private",
    label: "Private Connection",
    value:
      "postgresql://postgres:super-secret-password@pg-orders.internal-db-fkn129-postgresql.ns-mz0dmtig.svc.cluster.local:5432/postgresql-db-fkn129",
  },
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    publicAccess: { enabled: true },
    value:
      "postgresql://postgres:public-secret@ep-orders-public.sealos.run:5432/postgresql-db-fkn129?sslmode=require",
  },
];

const DATABASE_NODE_CANVAS_NODES: Node<
  CanvasDatabaseNodeData,
  "databaseNode"
>[] = [
  {
    data: { connections, states },
    id: "database-node-collapsed",
    position: { x: 180, y: 130 },
    selected: true,
    type: "databaseNode",
  },
  {
    data: {
      connections,
      defaultExpanded: true,
      states: {
        ...states,
        name: "orders-reporting",
      },
    },
    id: "database-node-expanded",
    position: { x: 560, y: 120 },
    type: "databaseNode",
  },
];

const DATABASE_NODE_CANVAS_EDGES: Edge[] = [];

const DATABASE_NODE_CANVAS_NODE_TYPES = {
  databaseNode: PreviewCanvasDatabaseNode,
} as const satisfies NodeTypes;

export default function DatabaseNodeCanvasPreview() {
  const canvasMeta = useMemo(
    (): CanvasMeta => ({
      nodeTypes: DATABASE_NODE_CANVAS_NODE_TYPES,
      reactFlowProps: {
        fitViewOptions: { padding: 0.45 },
      },
    }),
    []
  );

  const canvasState = useMemo(
    () => ({
      edges: DATABASE_NODE_CANVAS_EDGES,
      nodes: DATABASE_NODE_CANVAS_NODES,
    }),
    []
  );

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview className="h-96" showMaximize title="Database node canvas">
        <div className="relative size-full overflow-hidden rounded-xl border border-border">
          <Canvas.Root meta={canvasMeta} state={canvasState}>
            <Canvas.Flow />
          </Canvas.Root>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
