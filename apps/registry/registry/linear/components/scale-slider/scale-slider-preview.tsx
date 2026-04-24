"use client";

import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";

export default function ScaleSliderPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="Scale slider">
        <ScaleSlider.Root
          defaultValue={3}
          max={10}
          maxDecimals={0}
          min={0}
          step={1}
          valueDisplay="number"
        >
          <ScaleSlider.Stack className="w-full max-w-md">
            <ScaleSlider.Header>
              <ScaleSlider.Label>Replicas</ScaleSlider.Label>
              <ScaleSlider.Value />
            </ScaleSlider.Header>
            <ScaleSlider.Control>
              <ScaleSlider.Track>
                <ScaleSlider.Range />
              </ScaleSlider.Track>
              <ScaleSlider.Thumb />
            </ScaleSlider.Control>
          </ScaleSlider.Stack>
        </ScaleSlider.Root>
      </Preview>
    </PreviewWrapper>
  );
}
