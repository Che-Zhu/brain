"use client";

import "@xyflow/react/dist/style.css";
import "./project-flow.css";

import { cn } from "@workspace/ui/lib/utils";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  PROJECT_FLOW_DEFAULT_NODE_TYPES,
  ProjectFlowContainerNode,
} from "./project-flow-nodes";

const ProjectFlowContext = createContext<ProjectFlowValue | null>(null);

export interface ProjectFlowStates {
  initialEdges: Edge[];
  initialNodes: Node[];
}

export interface ProjectFlowActions {
  onConnect?: (connection: Connection) => void;
}

export interface ProjectFlowValue {
  actions: ProjectFlowActions;
  states: ProjectFlowStates;
}

export function useProjectFlow(): ProjectFlowValue {
  const value = useContext(ProjectFlowContext);
  if (!value) {
    throw new Error(
      "ProjectFlow: useProjectFlow must be used within ProjectFlow.Root"
    );
  }
  return value;
}

function ProjectFlowShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border",
        className
      )}
      data-slot="project-flow"
      {...props}
    />
  );
}

function ProjectFlowVariant0({
  className,
  flowClassName,
  nodeTypes: extraNodeTypes,
}: ComponentProps<typeof ProjectFlowShell> & {
  flowClassName?: string;
  /** Merged with built-in types (`containerNode`, …). */
  nodeTypes?: Partial<NodeTypes>;
}) {
  const { actions, states } = useProjectFlow();
  const [nodes, setNodes] = useState<Node[]>(() => [...states.initialNodes]);
  const [edges, setEdges] = useState<Edge[]>(() => [...states.initialEdges]);

  const nodeTypes = useMemo(
    (): NodeTypes => ({
      ...PROJECT_FLOW_DEFAULT_NODE_TYPES,
      ...extraNodeTypes,
    }),
    [extraNodeTypes]
  );

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    setNodes((snapshot) => applyNodeChanges(changes, snapshot));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((snapshot) => applyEdgeChanges(changes, snapshot));
  }, []);

  const { onConnect: onConnectAction } = actions;

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((snapshot) => addEdge(params, snapshot));
      onConnectAction?.(params);
    },
    [onConnectAction]
  );

  return (
    <ProjectFlowShell className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="relative flex h-full w-full min-w-0 flex-1 flex-col">
        <ReactFlow
          className={cn("h-full min-h-0 w-full", flowClassName)}
          edges={edges}
          fitView
          maxZoom={1.3}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          panOnDrag
          panOnScroll
          proOptions={{ hideAttribution: true }}
          snapGrid={[20, 20]}
          snapToGrid
        >
          <Background
            color="#999"
            gap={40}
            size={0.7}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>
    </ProjectFlowShell>
  );
}

function ProjectFlowRoot({
  actions = {},
  children,
  states,
}: {
  actions?: ProjectFlowActions;
  children?: ReactNode;
  states: ProjectFlowStates;
}) {
  const value = useMemo(
    (): ProjectFlowValue => ({ actions, states }),
    [actions, states]
  );

  return (
    <ProjectFlowContext.Provider value={value}>
      {children}
    </ProjectFlowContext.Provider>
  );
}

export const ProjectFlow = Object.assign(ProjectFlowShell, {
  ContainerNode: ProjectFlowContainerNode,
  Context: ProjectFlowContext,
  Root: ProjectFlowRoot,
  Shell: ProjectFlowShell,
  Variant0: ProjectFlowVariant0,
  useProjectFlow,
});

ProjectFlowRoot.displayName = "ProjectFlow.Root";
ProjectFlowVariant0.displayName = "ProjectFlow.Variant0";
ProjectFlowShell.displayName = "ProjectFlow.Shell";
