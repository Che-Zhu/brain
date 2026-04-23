import { Canvas } from "@/features/canvas/Canvas";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="h-[100dvh] w-full">
      <Canvas projectId={projectId} />
    </div>
  );
}
