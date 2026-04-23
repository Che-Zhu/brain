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
  createContext,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/** Maps 0–100% usage to theme text classes (see `globals.css` `--color-theme-*`). */
export function usagePercentToneClass(value: number): string {
  if (!Number.isFinite(value)) {
    return "text-theme-gray";
  }
  if (value > 90) {
    return "text-theme-red";
  }
  if (value >= 75) {
    return "text-theme-yellow";
  }
  return "text-theme-green";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// --- Context (state lives only in Root / CompactRoot) ---

export interface ScaleSliderStates {
  compact: boolean;
  current: number;
  disabled: boolean;
  flowValue: number;
  max: number;
  maxDecimals: number;
  min: number;
  step: number;
  /** `percent`: NumberFlow shows normalized range as %; `number`: raw `current`. */
  valueDisplay: "percent" | "number";
}

export interface ScaleSliderActions {
  /** Called when slider value changes (after clamping). */
  onScale?: (value: number) => void;
}

export interface ScaleSliderValue {
  actions: ScaleSliderActions;
  states: ScaleSliderStates;
}

interface ScaleSliderContextValue extends ScaleSliderValue {
  setValueFromRadix: (next: number[]) => void;
}

const ScaleSliderContext = createContext<ScaleSliderContextValue | null>(null);

export function useScaleSlider(component = "ScaleSlider"): ScaleSliderValue {
  const ctx = useContext(ScaleSliderContext);
  if (!ctx) {
    throw new Error(
      `${component} must be used within ScaleSlider.Root or ScaleSlider.CompactRoot`
    );
  }
  return { actions: ctx.actions, states: ctx.states };
}

function useScaleSliderContext(component: string): ScaleSliderContextValue {
  const ctx = useContext(ScaleSliderContext);
  if (!ctx) {
    throw new Error(
      `${component} must be used within ScaleSlider.Root or ScaleSlider.CompactRoot`
    );
  }
  return ctx;
}

interface ScaleSliderRootBaseProps {
  actions?: ScaleSliderActions;
  children: ReactNode;
  compact: boolean;
  defaultValue?: number;
  disabled?: boolean;
  max?: number;
  maxDecimals?: number;
  min?: number;
  onValueChange?: (value: number) => void;
  step?: number;
  value?: number;
  valueDisplay?: "percent" | "number";
}

function ScaleSliderRootBase({
  actions = {},
  children,
  compact,
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  min: minProp,
  max: maxProp,
  step = 0.1,
  maxDecimals = 1,
  disabled = false,
  valueDisplay = "percent",
}: ScaleSliderRootBaseProps) {
  const min = minProp ?? 0;
  const max = maxProp ?? 100;
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(() =>
    clamp(defaultValue, min, max)
  );

  const current = isControlled
    ? clamp(valueProp as number, min, max)
    : uncontrolled;

  const setValueFromRadix = useCallback(
    (next: number[]) => {
      const n = next[0];
      if (n === undefined) {
        return;
      }
      const c = clamp(n, min, max);
      if (!isControlled) {
        setUncontrolled(c);
      }
      actions.onScale?.(c);
      onValueChange?.(c);
    },
    [actions, isControlled, max, min, onValueChange]
  );

  const span = max - min;
  const flowValue =
    !Number.isFinite(current) || span <= 0 ? 0 : (current - min) / span;

  const contextValue = useMemo(
    (): ScaleSliderContextValue => ({
      actions,
      states: {
        compact,
        current,
        disabled,
        flowValue,
        max,
        maxDecimals,
        min,
        step,
        valueDisplay,
      },
      setValueFromRadix,
    }),
    [
      actions,
      compact,
      current,
      disabled,
      flowValue,
      max,
      maxDecimals,
      min,
      setValueFromRadix,
      step,
      valueDisplay,
    ]
  );

  return (
    <ScaleSliderContext.Provider value={contextValue}>
      {children}
    </ScaleSliderContext.Provider>
  );
}

function ScaleSliderRoot(props: Omit<ScaleSliderRootBaseProps, "compact">) {
  return <ScaleSliderRootBase {...props} compact={false} />;
}

function ScaleSliderCompactRoot(
  props: Omit<ScaleSliderRootBaseProps, "compact">
) {
  return <ScaleSliderRootBase {...props} compact />;
}

function ScaleSliderGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

/** Vertical block: header row + slider (content). */
function ScaleSliderStack({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className)} {...props} />
  );
}

/** Top row; default aligns label + value to the end. Override with `className` (e.g. `justify-between`). */
function ScaleSliderHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2",
        className
      )}
      {...props}
    />
  );
}

function ScaleSliderLabel({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

function ScaleSliderIcon({
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
>;

function ScaleSliderControl({
  className,
  ...radixRest
}: ScaleSliderControlProps) {
  const {
    setValueFromRadix,
    states: { compact, current, disabled, max, min, step },
  } = useScaleSliderContext("ScaleSlider.Control");

  const { onPointerUp: userOnPointerUp, ...rootRest } =
    radixRest as ScaleSliderControlProps;

  const rootRef = useRef<HTMLSpanElement>(null);

  const blurFocusedInsideRoot = useCallback((root: HTMLElement) => {
    queueMicrotask(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)) {
        active.blur();
      }
    });
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLSpanElement>) => {
      userOnPointerUp?.(event as never);
      if (event.pointerType === "mouse") {
        blurFocusedInsideRoot(event.currentTarget);
      }
    },
    [blurFocusedInsideRoot, userOnPointerUp]
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
      onValueChange={setValueFromRadix}
      ref={rootRef}
      step={step}
      value={[current]}
    />
  );
}

function ScaleSliderTrack({
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

function ScaleSliderRange({
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

function ScaleSliderThumb({
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

/** Fixed header readout (does not move with the thumb). Place inside {@link ScaleSliderHeader}. */
function ScaleSliderValue({ className }: { className?: string }) {
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
  useScaleSlider,
};
