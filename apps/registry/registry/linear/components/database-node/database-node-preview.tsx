"use client";

import type {
  DatabaseNodeAction,
  DatabaseNodeConnection,
  DatabaseNodeConnectionKey,
  DatabaseNodeLifecycleActions,
  DatabaseNodeQuickActions,
  DatabaseNodeStates,
  DatabaseNodeTogglePublicConnectionHandler,
} from "@workspace/ui/components/database-node/database-node";
import { DatabaseNode } from "@workspace/ui/components/database-node/database-node";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { ReactNode } from "react";
import { useState } from "react";

const privateConnection =
  "postgresql://postgres:super-secret-password@pg-orders.internal-db-fkn129-postgresql.ns-mz0dmtig.svc.cluster.local:5432/postgresql-db-fkn129";

const publicConnection =
  "postgresql://postgres:public-secret@ep-orders-public.sealos.run:5432/postgresql-db-fkn129?sslmode=require";

const longPrivateConnection =
  "postgresql://analytics_owner:very-long-secret-value@pg-orders-reporting-primary.internal-db-fkn129-postgresql.ns-mz0dmtig.svc.cluster.local:5432/postgresql-db-fkn129?connect_timeout=30&application_name=sealai-canvas-preview";

const baseStates: DatabaseNodeStates = {
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

const baseConnections: DatabaseNodeConnection[] = [
  {
    id: "private",
    kind: "private",
    label: "Private Connection",
    value: privateConnection,
  },
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    publicAccess: { enabled: false },
  },
];

const publicEnabledConnections: DatabaseNodeConnection[] = [
  baseConnections[0],
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    publicAccess: { enabled: true },
    value: publicConnection,
  },
];

const publicLoadingConnections: DatabaseNodeConnection[] = [
  baseConnections[0],
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    provisioningMessage: "Provisioning public endpoint",
    publicAccess: { enabled: true, loading: true },
  },
];

const missingConnections: DatabaseNodeConnection[] = [
  {
    id: "private",
    kind: "private",
    label: "Private Connection",
  },
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    publicAccess: { enabled: true },
  },
];

const longConnections: DatabaseNodeConnection[] = [
  {
    id: "private",
    kind: "private",
    label: "Private Connection",
    value: longPrivateConnection,
  },
  {
    id: "public",
    kind: "public",
    label: "Public Connection",
    publicAccess: { enabled: true },
    value:
      "postgresql://external_user:external-secret@long-public-endpoint-name.database.sealos.run:5432/reporting?sslmode=require&application_name=analytics-dashboard",
  },
];

const scrollConnections: DatabaseNodeConnection[] = [
  ...publicEnabledConnections,
  {
    id: "readonly",
    kind: "private",
    label: "Read-only Replica",
    value:
      "postgresql://reader:replica-secret@pg-orders-readonly.internal:5432/postgresql-db-fkn129",
  },
  {
    id: "direct",
    kind: "private",
    label: "Direct Service",
    value:
      "postgresql://postgres:service-secret@orders-postgresql.default.svc:5432/postgresql-db-fkn129",
  },
];

const loadingQuickActions = {
  console: { onClick: () => undefined },
  logs: { onClick: () => undefined },
  metrics: { loading: true, onClick: () => undefined },
} satisfies Record<string, DatabaseNodeAction>;

const loadingLifecycleActions = {
  delete: { onClick: () => undefined },
  restart: { loading: true, onClick: () => undefined },
  start: { onClick: () => undefined },
  stop: { onClick: () => undefined },
} satisfies Record<string, DatabaseNodeAction>;

function PreviewSurface({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-44 items-center justify-center bg-canvas-surface p-6">
      {children}
    </div>
  );
}

function DatabaseNodeSample({
  connections = baseConnections,
  copiedConnectionKey,
  defaultExpanded = false,
  dragging,
  lifecycleActions,
  quickActions,
  selected,
  states = baseStates,
}: {
  connections?: DatabaseNodeConnection[];
  copiedConnectionKey?: DatabaseNodeConnectionKey | null;
  defaultExpanded?: boolean;
  dragging?: boolean;
  lifecycleActions?: DatabaseNodeLifecycleActions;
  quickActions?: DatabaseNodeQuickActions;
  selected?: boolean;
  states?: DatabaseNodeStates;
}) {
  return (
    <DatabaseNode.Root
      connections={connections}
      copiedConnectionKey={copiedConnectionKey}
      defaultExpanded={defaultExpanded}
      interaction={{ dragging, selected }}
      lifecycleActions={lifecycleActions}
      onTogglePublicConnection={() => undefined}
      quickActions={quickActions}
      states={states}
    >
      <DatabaseNode.Content />
    </DatabaseNode.Root>
  );
}

function PublicToggleSample() {
  const [enabled, setEnabled] = useState(false);
  const connections: DatabaseNodeConnection[] = [
    baseConnections[0],
    {
      id: "public",
      kind: "public",
      label: "Public Connection",
      publicAccess: { enabled },
      value: enabled ? publicConnection : undefined,
    },
  ];
  const togglePublicConnection: DatabaseNodeTogglePublicConnectionHandler = (
    _connection,
    _index,
    nextEnabled
  ) => {
    setEnabled(nextEnabled);
  };

  return (
    <DatabaseNode.Root
      connections={connections}
      defaultExpanded
      onTogglePublicConnection={togglePublicConnection}
      quickActions={{
        console: { onClick: () => undefined },
        logs: { onClick: () => undefined },
        metrics: { onClick: () => undefined },
      }}
      states={baseStates}
    >
      <DatabaseNode.Content />
    </DatabaseNode.Root>
  );
}

export default function DatabaseNodePreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Collapsed default">
        <PreviewSurface>
          <DatabaseNodeSample />
        </PreviewSurface>
      </Preview>
      <Preview title="Collapsed selected">
        <PreviewSurface>
          <DatabaseNodeSample selected />
        </PreviewSurface>
      </Preview>
      <Preview title="Expanded default">
        <PreviewSurface>
          <DatabaseNodeSample
            defaultExpanded
            quickActions={{
              console: { onClick: () => undefined },
              logs: { onClick: () => undefined },
              metrics: { onClick: () => undefined },
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Public enabled">
        <PreviewSurface>
          <DatabaseNodeSample
            connections={publicEnabledConnections}
            defaultExpanded
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Public loading">
        <PreviewSurface>
          <DatabaseNodeSample
            connections={publicLoadingConnections}
            defaultExpanded
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Copied feedback">
        <PreviewSurface>
          <DatabaseNodeSample
            connections={publicEnabledConnections}
            copiedConnectionKey="private"
            defaultExpanded
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Missing values">
        <PreviewSurface>
          <DatabaseNodeSample
            connections={missingConnections}
            defaultExpanded
            states={{
              ...baseStates,
              metrics: { cpu: 18 },
              status: undefined,
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Long values">
        <PreviewSurface>
          <DatabaseNodeSample
            connections={longConnections}
            defaultExpanded
            states={{
              ...baseStates,
              name: "orders-primary-postgresql-database-production",
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Scrollable connections">
        <PreviewSurface>
          <DatabaseNodeSample connections={scrollConnections} defaultExpanded />
        </PreviewSurface>
      </Preview>
      <Preview title="Action loading">
        <PreviewSurface>
          <DatabaseNodeSample
            defaultExpanded
            lifecycleActions={loadingLifecycleActions}
            quickActions={loadingQuickActions}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Fallback engine icon">
        <PreviewSurface>
          <DatabaseNodeSample
            states={{
              ...baseStates,
              displayEngine: "TimescaleDB",
              engineKey: "timescaledb",
              formattedVersion: "2.16",
              name: "metrics-store",
            }}
          />
        </PreviewSurface>
      </Preview>
      <Preview title="Public toggle">
        <PreviewSurface>
          <PublicToggleSample />
        </PreviewSurface>
      </Preview>
      <Preview className="lg:col-span-2" title="Footer metric coverage">
        <PreviewSurface>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DatabaseNodeSample />
            <DatabaseNodeSample
              states={{
                ...baseStates,
                metrics: { memory: "41%" },
                name: "partial-metrics",
              }}
            />
            <DatabaseNodeSample
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
    </PreviewWrapper>
  );
}
