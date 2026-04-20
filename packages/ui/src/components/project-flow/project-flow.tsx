"use client";

import "@xyflow/react/dist/style.css";
import "./project-flow.css";

import type {
  ContainerNodeActions,
  ContainerNodeStates,
} from "@workspace/ui/components/container-node/container-node";
import { ContainerNode } from "@workspace/ui/components/container-node/container-node";
import { cn } from "@workspace/ui/lib/utils";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  Position,
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

const ProjectFlowContext = createContext<ProjectFlowValue | null>(null);

/** Register on nodes as `type: PROJECT_FLOW_NODE_TYPE_CONTAINER`. */
export const PROJECT_FLOW_NODE_TYPE_CONTAINER = "containerNode" as const;

export interface ProjectFlowContainerNodeData extends Record<string, unknown> {
  actions?: ContainerNodeActions;
  states: ContainerNodeStates;
}

export type ProjectFlowContainerRfNode = Node<
  ProjectFlowContainerNodeData,
  typeof PROJECT_FLOW_NODE_TYPE_CONTAINER
>;

function ProjectFlowContainerNode({
  data,
}: NodeProps<ProjectFlowContainerRfNode>) {
  const { actions = {}, states } = data;
  return (
    <div className="nodrag nopan [&_button]:nodrag [&_[role=menuitem]]:nodrag">
      <Handle className="bg-border!" position={Position.Top} type="target" />
      <ContainerNode.Root actions={actions} states={states}>
        <ContainerNode.Variant0 className="max-w-60" />
      </ContainerNode.Root>
      <Handle className="bg-border!" position={Position.Bottom} type="source" />
    </div>
  );
}

/** Default React Flow `nodeTypes` including the container workload card. */
export const PROJECT_FLOW_DEFAULT_NODE_TYPES = {
  [PROJECT_FLOW_NODE_TYPE_CONTAINER]: ProjectFlowContainerNode,
} as const satisfies NodeTypes;

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
    <ProjectFlowShell className={className}>
      <div className="h-72 min-h-[200px] w-full min-w-0 flex-1">
        <ReactFlow
          className={flowClassName}
          edges={edges}
          fitView
          maxZoom={1.3}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          proOptions={{ hideAttribution: true }}
        />
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
ProjectFlowContainerNode.displayName = "ProjectFlow.ContainerNode";
