"use client";

import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  type CanvasEdgeAnchorPair,
  resolveCanvasEdgeAnchors,
} from "./canvas.edge-anchors";
import { mergeNodes } from "./canvas.node-merge";
import { CanvasPanel } from "./canvas.panel";
import { CanvasProvider } from "./canvas.provider";
import type { CanvasActions, CanvasReactFlowProps } from "./canvas.types";
import {
  CanvasUpperRight,
  CanvasUpperRightAnchor,
  CanvasUpperRightProvider,
} from "./canvas.upper-right";
import { useCanvas } from "./canvas.use";
import {
  initialCanvasViewportFollowState,
  resolveCanvasViewportFollow,
} from "./canvas.viewport-follow";

export interface CanvasFlowProps {
  children?: ReactNode;
}

export interface CanvasRootProps {
  actions?: Partial<CanvasActions>;
  children?: ReactNode;
  meta?: Parameters<typeof CanvasProvider>[0]["meta"];
  state: Parameters<typeof CanvasProvider>[0]["state"];
}

const CANVAS_DEFAULT_EDGE_STYLE = {
  stroke: "var(--color-blue-400)",
  strokeDasharray: "6 6",
};
const DEFAULT_OPENING_FIT_KEY = "__default__";
const OPENING_FIT_ANIMATION_MS = 300;
const OPENING_FIT_SETTLE_MS = 150;
const VIEWPORT_FOLLOW_ANIMATION_MS = 300;

function CanvasFlow({ children }: CanvasFlowProps) {
  const { meta, state } = useCanvas();
  const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges);
  const { fitView, getZoom, setCenter, viewportInitialized } = useReactFlow<
    Node,
    Edge
  >();
  const nodesInitialized = useNodesInitialized();
  const flowHeight = useStore((store) => store.height);
  const flowWidth = useStore((store) => store.width);
  const initializedRef = useRef(false);
  const openingFitAppliedKeyRef = useRef<number | string | null>(null);
  const viewportFollowStateRef = useRef(initialCanvasViewportFollowState);
  const edgeAnchorPairsRef = useRef(new Map<string, CanvasEdgeAnchorPair>());

  useLayoutEffect(() => {
    if (initializedRef.current) {
      setNodes((prev) => mergeNodes(prev, state.nodes));
    } else {
      initializedRef.current = true;
      setNodes(state.nodes);
    }
  }, [setNodes, state.nodes]);

  useLayoutEffect(() => {
    setEdges(state.edges);
  }, [setEdges, state.edges]);

  const edgesWithSelectionStyle = useMemo((): Edge[] => {
    const selected = state.selectedEdge;
    if (selected == null) {
      return edges;
    }
    return edges.map((edge) => {
      if (edge.id !== selected.id) {
        return edge;
      }
      const prev =
        edge.style && typeof edge.style === "object" ? edge.style : {};
      return {
        ...edge,
        style: {
          ...CANVAS_DEFAULT_EDGE_STYLE,
          ...prev,
          stroke: CANVAS_DEFAULT_EDGE_STYLE.stroke,
        },
      };
    });
  }, [edges, state.selectedEdge]);
  const edgeAnchorResolver = meta.edgeAnchorResolver;
  const nodeDragging = nodes.some((node) => node.dragging === true);
  const edgeAnchorResolution = useMemo(() => {
    if (edgeAnchorResolver == null) {
      return {
        anchorPairs: edgeAnchorPairsRef.current,
        edges: edgesWithSelectionStyle,
      };
    }

    return resolveCanvasEdgeAnchors({
      dragging: nodeDragging,
      edges: edgesWithSelectionStyle,
      nodes,
      previousPairs: edgeAnchorPairsRef.current,
      resolver: edgeAnchorResolver,
    });
  }, [edgeAnchorResolver, edgesWithSelectionStyle, nodeDragging, nodes]);

  useEffect(() => {
    if (edgeAnchorResolver == null) {
      edgeAnchorPairsRef.current.clear();
      return;
    }

    edgeAnchorPairsRef.current = edgeAnchorResolution.anchorPairs;
  }, [edgeAnchorResolver, edgeAnchorResolution.anchorPairs]);

  const userReactFlowProps = meta.reactFlowProps ?? {};
  const userDefaultEdgeOptions = userReactFlowProps.defaultEdgeOptions;
  const userConnectionLineStyle = userReactFlowProps.connectionLineStyle;
  const openingFitViewOptions = userReactFlowProps.fitViewOptions;
  const shouldFitOpeningView = userReactFlowProps.fitView !== false;
  const passThrough: CanvasReactFlowProps = {
    connectionMode: ConnectionMode.Loose,
    maxZoom: 1.2,
    minZoom: 0.3,
    panOnDrag: true,
    panOnScroll: true,
    proOptions: { hideAttribution: true },
    selectNodesOnDrag: false,
    snapGrid: [8, 8],
    snapToGrid: true,
    ...userReactFlowProps,
    fitView: false,
    connectionLineStyle: {
      ...CANVAS_DEFAULT_EDGE_STYLE,
      ...(userConnectionLineStyle ?? {}),
    },
    defaultEdgeOptions: {
      ...userDefaultEdgeOptions,
      style: {
        ...CANVAS_DEFAULT_EDGE_STYLE,
        ...(userDefaultEdgeOptions?.style ?? {}),
      },
    },
  };
  const openingFitKey = meta.openingFitView?.key ?? DEFAULT_OPENING_FIT_KEY;
  const nodeCount = nodes.length;
  const viewportFollow = meta.viewportFollow;
  const viewportFollowKey = viewportFollow?.key ?? openingFitKey;

  useEffect(() => {
    if (
      openingFitAppliedKeyRef.current === openingFitKey ||
      !shouldFitOpeningView ||
      !viewportInitialized ||
      !nodesInitialized ||
      flowHeight <= 0 ||
      flowWidth <= 0 ||
      nodeCount === 0
    ) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    const settleTimer = window.setTimeout(() => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          openingFitAppliedKeyRef.current = openingFitKey;
          fitView({
            duration: OPENING_FIT_ANIMATION_MS,
            ...openingFitViewOptions,
          });
        });
      });
    }, OPENING_FIT_SETTLE_MS);

    return () => {
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    fitView,
    flowHeight,
    flowWidth,
    nodeCount,
    nodesInitialized,
    openingFitKey,
    openingFitViewOptions,
    shouldFitOpeningView,
    viewportInitialized,
  ]);

  useEffect(() => {
    const isFollowTarget = viewportFollow?.isFollowTarget;
    if (isFollowTarget === undefined) {
      viewportFollowStateRef.current = initialCanvasViewportFollowState;
      return;
    }

    const result = resolveCanvasViewportFollow({
      isFollowTarget,
      key: viewportFollowKey,
      nodes,
      state: viewportFollowStateRef.current,
    });
    viewportFollowStateRef.current = result.state;

    if (
      !(viewportInitialized && nodesInitialized) ||
      flowHeight <= 0 ||
      flowWidth <= 0
    ) {
      return;
    }

    if (result.action.kind === "setCenter") {
      const { nodeId } = result.action;
      const node = nodes.find((candidate) => candidate.id === nodeId);
      if (node === undefined) {
        return;
      }
      const width = node.measured?.width ?? node.width ?? 0;
      const height = node.measured?.height ?? node.height ?? 0;
      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        duration: VIEWPORT_FOLLOW_ANIMATION_MS,
        zoom: getZoom(),
      });
      return;
    }

    if (result.action.kind === "fitView") {
      fitView({
        duration: VIEWPORT_FOLLOW_ANIMATION_MS,
        nodes: result.action.nodeIds.map((id) => ({ id })),
      });
    }
  }, [
    fitView,
    flowHeight,
    flowWidth,
    getZoom,
    nodes,
    nodesInitialized,
    setCenter,
    viewportFollow?.isFollowTarget,
    viewportFollowKey,
    viewportInitialized,
  ]);

  return (
    <CanvasUpperRightProvider>
      <div className="relative h-full min-h-0 w-full min-w-0">
        <CanvasUpperRightAnchor />
        <div className="canvas-surface">
          <ReactFlow
            {...passThrough}
            edges={edgeAnchorResolution.edges}
            edgeTypes={meta.edgeTypes}
            nodes={nodes}
            nodeTypes={meta.nodeTypes}
            onEdgesChange={onEdgesChange}
            onNodesChange={onNodesChange}
          >
            <Background
              color="var(--color-canvas-dot)"
              gap={32}
              size={1}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
        </div>
        {children}
      </div>
    </CanvasUpperRightProvider>
  );
}

function CanvasRoot({ actions, children, meta, state }: CanvasRootProps) {
  return (
    <CanvasProvider actions={actions} meta={meta} state={state}>
      {children}
    </CanvasProvider>
  );
}

function CanvasSurface({ children }: CanvasFlowProps) {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <ReactFlowProvider>
        <CanvasFlow>{children}</CanvasFlow>
      </ReactFlowProvider>
    </div>
  );
}

export const Canvas = Object.assign(CanvasSurface, {
  Flow: CanvasSurface,
  Panel: CanvasPanel,
  Root: CanvasRoot,
  UpperRight: CanvasUpperRight,
});

export type CanvasProps = CanvasRootProps;
