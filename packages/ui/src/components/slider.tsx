"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@workspace/ui/lib/utils";
import React from "react";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = React.useMemo(() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (Array.isArray(defaultValue)) {
      return defaultValue;
    }

    return [min, max];
  }, [value, defaultValue, min, max]);
  const sliderId = React.useId();
  const thumbIds = React.useMemo(
    () =>
      Array.from(
        { length: _values.length },
        (_, index) => `${sliderId}-thumb-${index}`
      ),
    [_values.length, sliderId]
  );

  return (
    <SliderPrimitive.Root
      className="data-vertical:h-full data-horizontal:w-full"
      data-slot="slider"
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      <SliderPrimitive.Control
        className={cn(
          "relative flex w-full touch-none select-none items-center data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50",
          className
        )}
      >
        <SliderPrimitive.Track
          className="relative select-none overflow-hidden rounded-full bg-muted data-horizontal:h-1.5 data-vertical:h-full data-horizontal:w-full data-vertical:w-1.5"
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className="select-none bg-primary data-horizontal:h-full data-vertical:w-full"
            data-slot="slider-range"
          />
        </SliderPrimitive.Track>
        {thumbIds.map((thumbId) => (
          <SliderPrimitive.Thumb
            className="block size-4 shrink-0 select-none rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:outline-hidden focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50"
            data-slot="slider-thumb"
            key={thumbId}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
