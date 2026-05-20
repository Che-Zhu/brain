import type { CanvasReactFlowProps } from "@workspace/ui/components/canvas/canvas.types";

export interface ProjectCanvasInteractionOptions {
  readOnly: boolean;
}

type ProjectCanvasInteractionProps = Pick<
  CanvasReactFlowProps,
  | "connectOnClick"
  | "edgesReconnectable"
  | "nodesConnectable"
  | "nodesDraggable"
  | "onConnect"
>;

export function projectCanvasInteractionProps({
  readOnly,
}: ProjectCanvasInteractionOptions): ProjectCanvasInteractionProps {
  return {
    connectOnClick: false,
    edgesReconnectable: false,
    nodesConnectable: false,
    nodesDraggable: !readOnly,
    onConnect: () => undefined,
  };
}
