"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type {
  ScaleSliderActions,
  ScaleSliderValue,
} from "./scale-slider.types";
import { clampScale } from "./scale-slider.utils";

interface ScaleSliderContextValue extends ScaleSliderValue {
  setValueFromRadix: (next: number[]) => void;
}

export const ScaleSliderContext = createContext<ScaleSliderContextValue | null>(
  null
);

export function useScaleSlider(component = "ScaleSlider"): ScaleSliderValue {
  const ctx = useContext(ScaleSliderContext);
  if (!ctx) {
    throw new Error(
      `${component} must be used within ScaleSlider.Root or ScaleSlider.CompactRoot`
    );
  }
  return { actions: ctx.actions, states: ctx.states };
}

export function useScaleSliderContext(
  component: string
): ScaleSliderContextValue {
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
    clampScale(defaultValue, min, max)
  );

  const current = isControlled
    ? clampScale(valueProp as number, min, max)
    : uncontrolled;

  const setValueFromRadix = useCallback(
    (next: number[]) => {
      const n = next[0];
      if (n === undefined) {
        return;
      }
      const c = clampScale(n, min, max);
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

export function ScaleSliderRoot(
  props: Omit<ScaleSliderRootBaseProps, "compact">
) {
  return <ScaleSliderRootBase {...props} compact={false} />;
}

export function ScaleSliderCompactRoot(
  props: Omit<ScaleSliderRootBaseProps, "compact">
) {
  return <ScaleSliderRootBase {...props} compact />;
}
