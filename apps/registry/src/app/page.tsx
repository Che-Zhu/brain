import { DitherCanvas } from "@/components/dither/dither-canvas";

export default function Page() {
  return (
    <div className="overflow-hiden inset-0 flex-1 flex-colet-0">
      <DitherCanvas
        className="absolute inset-0 block h-full w-full touch-none"
        image="/linear-app-icon.png"
      />
    </div>
  );
}
