"use client";

import { Canvas } from "@workspace/ui/components/canvas/canvas";
import { useAtomValue } from "jotai";
import { useParams } from "next/navigation";

import { useProjectServices } from "@/hooks/use-project-services";
import { encodedKubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { canvasMetaAtom } from "@/store/canvas-store";

export default function ProjectUidPage() {
  const params = useParams<{ uid: string }>();
  const uid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(encodedKubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const canvasMeta = useAtomValue(canvasMetaAtom);

  const { canvasState, error, isLoading } = useProjectServices({
    auth: { kubeconfig, type: "kubeconfig" },
    namespace,
    uid,
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {kubeconfig !== "" &&
        !isLoading &&
        error == null &&
        canvasState.nodes.length > 0 && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Canvas.Root meta={canvasMeta} state={canvasState}>
              <Canvas.Flow />
            </Canvas.Root>
          </div>
        )}
    </div>
  );
}
