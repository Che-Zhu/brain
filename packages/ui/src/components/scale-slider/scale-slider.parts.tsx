"use client";

import NumberFlow, { continuous } from "@number-flow/react";
import {
  Range as SliderRange,
  Root as SliderRoot,
  Thumb as SliderThumb,
  Track as SliderTrack,
} from "@radix-ui/react-slider";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type PointerEvent,
  useCallback,
  useRef,
} from "react";

import { useScaleSliderContext } from "./scale-slider.context";
import { usagePercentToneClass } from "./scale-slider.utils";

export function ScaleSliderIcon({
  icon: Icon,
  className,
}: {
  className?: string;
  icon: LucideIcon;
}) {
  const {
    states: { compact, flowValue },
  } = useScaleSliderContext("ScaleSlider.Icon");
  return (
    <Icon
      aria-hidden
      className={cn(
        "shrink-0 stroke-2 transition-colors duration-200",
        compact ? "size-2.5" : "size-3",
        usagePercentToneClass(flowValue * 100),
        className
      )}
    />
  );
}

type SliderRootProps = ComponentPropsWithoutRef<typeof SliderRoot>;

type ScaleSliderControlProps = Omit<
  SliderRootProps,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "min"
  | "max"
  | "step"
  | "disabled"
> & {
  /**
   * Radix Slider has no `onValueCommit`; we invoke this on pointer release with the
   * latest value (after the final in-drag `onValueChange`), for “commit on release” UX.
   */
  onValueCommit?: (value: number[]) => void;
};

export function ScaleSliderControl({
  className,
  onValueCommit,
  ...radixRest
}: ScaleSliderControlProps) {
  const {
    setValueFromRadix,
    states: { compact, current, disabled, max, min, step },
  } = useScaleSliderContext("ScaleSlider.Control");

  const { onPointerUp: userOnPointerUp, ...rootRest } = radixRest as Omit<
    ScaleSliderControlProps,
    "onValueCommit"
  >;

  const rootRef = useRef<HTMLSpanElement>(null);
  /** Latest thumb value; updated on each Radix `onValueChange` so pointer-up sees the final drag value even before React re-renders. */
  const valueAtCommitRef = useRef(current);
  valueAtCommitRef.current = current;

  const blurFocusedInsideRoot = useCallback((root: HTMLElement) => {
    queueMicrotask(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)) {
        active.blur();
      }
    });
  }, []);

  const handleValueChange = useCallback(
    (next: number[]) => {
      const n = next[0];
      if (n !== undefined) {
        valueAtCommitRef.current = n;
      }
      setValueFromRadix(next);
    },
    [setValueFromRadix]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      userOnPointerUp?.(event as never);
      if (!disabled) {
        onValueCommit?.([valueAtCommitRef.current]);
      }
      if (event.pointerType === "mouse") {
        blurFocusedInsideRoot(event.currentTarget);
      }
    },
    [blurFocusedInsideRoot, disabled, onValueCommit, userOnPointerUp]
  );

  return (
    <SliderRoot
      {...rootRest}
      className={cn(
        "relative flex min-w-0 touch-none select-none items-center",
        compact ? "h-3 w-full" : "h-4 w-full min-w-0",
        disabled && "opacity-70",
        className
      )}
      disabled={disabled}
      max={max}
      min={min}
      onPointerUp={handlePointerUp}
      onValueChange={handleValueChange}
      ref={rootRef}
      step={step}
      value={[current]}
    />
  );
}

export function ScaleSliderTrack({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SliderTrack>) {
  const {
    states: { compact },
  } = useScaleSliderContext("ScaleSlider.Track");
  return (
    <SliderTrack
      className={cn(
        "relative grow rounded-full bg-muted",
        compact ? "h-px" : "h-0.5",
        className
      )}
      {...props}
    />
  );
}

export function ScaleSliderRange({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SliderRange>) {
  return (
    <SliderRange
      className={cn("absolute h-full rounded-full bg-foreground", className)}
      {...props}
    />
  );
}

export function ScaleSliderThumb({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SliderThumb>) {
  const {
    states: { compact },
  } = useScaleSliderContext("ScaleSlider.Thumb");
  return (
    <SliderThumb
      aria-label="Value"
      className={cn(
        "relative block shrink-0 rounded-full border border-border bg-background shadow-sm ring-1 ring-foreground/10 hover:cursor-grab focus:cursor-grabbing",
        compact ? "size-2.5" : "size-3 rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </SliderThumb>
  );
}

/** Fixed header readout (does not move with the thumb). Place inside `ScaleSlider.Header`. */
export function ScaleSliderValue({ className }: { className?: string }) {
  const {
    states: { compact, current, flowValue, maxDecimals, valueDisplay },
  } = useScaleSliderContext("ScaleSlider.Value");
  const isPercent = valueDisplay === "percent";
  return (
    <NumberFlow
      className={cn(
        "shrink-0 font-medium text-muted-foreground tabular-nums leading-none",
        compact ? "text-[10px]" : "text-xs",
        className
      )}
      format={
        isPercent
          ? {
              maximumFractionDigits: maxDecimals,
              style: "percent",
            }
          : {
              maximumFractionDigits: maxDecimals,
            }
      }
      isolate
      locales="en-US"
      opacityTiming={{
        duration: 250,
        easing: "ease-out",
      }}
      plugins={[continuous]}
      transformTiming={{
        duration: 500,
        easing:
          "linear(0, 0.0033 0.8%, 0.0263 2.39%, 0.0896 4.77%, 0.4676 15.12%, 0.5688, 0.6553, 0.7274, 0.7862, 0.8336 31.04%, 0.8793, 0.9132 38.99%, 0.9421 43.77%, 0.9642 49.34%, 0.9796 55.71%, 0.9893 62.87%, 0.9952 71.62%, 0.9983 82.76%, 0.9996 99.47%)",
      }}
      value={isPercent ? flowValue : current}
      willChange
    />
  );
}
