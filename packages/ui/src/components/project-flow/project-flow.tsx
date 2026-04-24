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
  useEffect,
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
  /**
   * When true (e.g. public preview): pan the canvas only; no node drag, selection,
   * connections, zoom, or pointer interaction on node chrome.
   */
  readOnly?: boolean;
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
      className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
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

  /** Keep flow in sync when `initialNodes` / `initialEdges` change (e.g. SWR fills metrics after mount). */
  useEffect(() => {
    setNodes((prev) => {
      const incoming = states.initialNodes;
      if (incoming.length === 0) {
        return prev;
      }
      if (prev.length === 0) {
        return [...incoming];
      }
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return incoming.map((inc) => {
        const old = prevById.get(inc.id);
        if (old == null) {
          return inc;
        }
        return {
          ...old,
          data: inc.data,
          type: inc.type,
        };
      });
    });
  }, [states.initialNodes]);

  useEffect(() => {
    setEdges([...states.initialEdges]);
  }, [states.initialEdges]);

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
  const isReadOnly = states.readOnly === true;

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((snapshot) => addEdge(params, snapshot));
      onConnectAction?.(params);
    },
    [onConnectAction]
  );

  /** Merge read-only into node `data` so container nodes can drop pointer events. */
  const nodesForView = useMemo((): Node[] => {
    if (!isReadOnly) {
      return nodes;
    }
    return nodes.map((n) => {
      if (n.data == null || typeof n.data !== "object") {
        return n;
      }
      return {
        ...n,
        data: { ...n.data, readOnly: true as const },
      };
    });
  }, [isReadOnly, nodes]);

  return (
    <ProjectFlowShell className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        className={cn(
          "relative flex h-full w-full min-w-0 flex-1 flex-col",
          isReadOnly && "[&_.react-flow__node]:select-none"
        )}
      >
        <ReactFlow
          className={cn("h-full min-h-0 w-full", flowClassName)}
          deleteKeyCode={isReadOnly ? null : undefined}
          edges={edges}
          elementsSelectable={!isReadOnly}
          fitView
          maxZoom={1.3}
          minZoom={0.2}
          multiSelectionKeyCode={isReadOnly ? null : undefined}
          nodes={nodesForView}
          nodesConnectable={!isReadOnly}
          nodesDraggable={!isReadOnly}
          nodeTypes={nodeTypes}
          onConnect={isReadOnly ? undefined : onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          panOnDrag
          panOnScroll
          proOptions={{ hideAttribution: true }}
          selectionKeyCode={isReadOnly ? null : undefined}
          selectionOnDrag={!isReadOnly}
          selectNodesOnDrag={!isReadOnly}
          snapGrid={[20, 20]}
          snapToGrid={!isReadOnly}
          zoomOnDoubleClick={!isReadOnly}
          zoomOnPinch={!isReadOnly}
          zoomOnScroll={!isReadOnly}
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
