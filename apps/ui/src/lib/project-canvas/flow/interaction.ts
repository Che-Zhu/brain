import type { CanvasReactFlowProps } from "@workspace/ui/components/canvas/canvas.types";

export interface ProjectCanvasInteractionOptions {
  onConnect?: NonNullable<CanvasReactFlowProps["onConnect"]>;
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
  onConnect,
  readOnly,
}: ProjectCanvasInteractionOptions): ProjectCanvasInteractionProps {
  return {
    connectOnClick: false,
    edgesReconnectable: false,
    nodesConnectable: !readOnly,
    nodesDraggable: !readOnly,
    onConnect: readOnly ? () => undefined : onConnect,
  };
}
