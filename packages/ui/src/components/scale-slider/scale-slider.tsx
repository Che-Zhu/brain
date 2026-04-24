"use client";

import {
  ScaleSliderCompactRoot,
  ScaleSliderRoot,
  useScaleSlider as useScaleSliderBound,
} from "./scale-slider.context";
import {
  ScaleSliderGroup,
  ScaleSliderHeader,
  ScaleSliderLabel,
  ScaleSliderStack,
} from "./scale-slider.layout";
import {
  ScaleSliderControl,
  ScaleSliderIcon,
  ScaleSliderRange,
  ScaleSliderThumb,
  ScaleSliderTrack,
  ScaleSliderValue,
} from "./scale-slider.parts";

// biome-ignore lint/performance/noBarrelFile: compound hook re-export for `import { useScaleSlider }`
export { useScaleSlider } from "./scale-slider.context";
export type {
  ScaleSliderActions,
  ScaleSliderStates,
  ScaleSliderValue,
} from "./scale-slider.types";

export { usagePercentToneClass } from "./scale-slider.utils";

/**
 * Radix Slider + NumberFlow (`continuous`) composed as compound components.
 *
 * @example
 * <ScaleSlider.Root defaultValue={42} maxDecimals={0}>
 *   <ScaleSlider.Stack className="w-full">
 *     <ScaleSlider.Header>
 *       <ScaleSlider.Label>Replicas</ScaleSlider.Label>
 *       <ScaleSlider.Value />
 *     </ScaleSlider.Header>
 *     <ScaleSlider.Control>
 *       <ScaleSlider.Track><ScaleSlider.Range /></ScaleSlider.Track>
 *       <ScaleSlider.Thumb />
 *     </ScaleSlider.Control>
 *   </ScaleSlider.Stack>
 * </ScaleSlider.Root>
 */
export const ScaleSlider = {
  CompactRoot: ScaleSliderCompactRoot,
  Control: ScaleSliderControl,
  Group: ScaleSliderGroup,
  Header: ScaleSliderHeader,
  Icon: ScaleSliderIcon,
  Label: ScaleSliderLabel,
  Range: ScaleSliderRange,
  Root: ScaleSliderRoot,
  Stack: ScaleSliderStack,
  Thumb: ScaleSliderThumb,
  Track: ScaleSliderTrack,
  Value: ScaleSliderValue,
  useScaleSlider: useScaleSliderBound,
};
