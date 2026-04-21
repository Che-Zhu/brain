"use client";

import NumberFlow, { useCanAnimate } from "@number-flow/react";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MotionNumberFlow = motion.create(NumberFlow);

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

/** Flash highlight behind digits; same thresholds as {@link usagePercentToneClass}. */
export function usagePercentFlashBgClass(value: number): string {
  if (!Number.isFinite(value)) {
    return "bg-theme-gray/40";
  }
  if (value > 90) {
    return "bg-theme-red/50";
  }
  if (value >= 75) {
    return "bg-theme-yellow/50";
  }
  return "bg-theme-green/50";
}

export interface FlashNumberProps {
  className?: string;
  /** Resource icon (e.g. `Cpu`, `MemoryStick`, `HardDrive`); neutral, not usage-colored. */
  icon: LucideIcon;
  /** Maximum fractional digits (e.g. 1 → one decimal in the percent). */
  maxDecimals?: number;
  /** Percentage on a 0–100 scale (e.g. `42.5` → `42.5%`). */
  value: number;
}

/**
 * Animated percentage readout with [NumberFlow](https://number-flow.barvian.me) +
 * [Motion](https://motion.dev) layout. Digits use usage tone (**&lt; 75%** green, **75–90%** yellow,
 * **&gt; 90%** red); icon stays muted like `ContainerNode.Resource`.
 * On value change, a tinted highlight (**theme-green/yellow/red** at `/50`, same bands as digits)
 * behind the numbers fades out quickly.
 */
export function FlashNumber({
  value,
  maxDecimals = 1,
  className,
  icon: Icon,
}: FlashNumberProps) {
  const canAnimate = useCanAnimate();
  const MotionIcon = useMemo(() => motion.create(Icon), [Icon]);

  const [flashKey, setFlashKey] = useState(0);
  const prevValue = useRef<number | null>(null);

  useEffect(() => {
    if (prevValue.current === null) {
      prevValue.current = value;
      return;
    }
    if (prevValue.current === value) {
      return;
    }
    prevValue.current = value;
    setFlashKey((k) => k + 1);
  }, [value]);

  const ratio = Number.isFinite(value) ? value / 100 : 0;
  const toneClass = usagePercentToneClass(value);
  const flashBgClass = usagePercentFlashBgClass(value);

  return (
    <MotionConfig
      transition={{
        layout: canAnimate
          ? { bounce: 0, duration: 0.9, type: "spring" }
          : { duration: 0 },
      }}
    >
      <motion.span
        className={cn("inline-flex items-center gap-1", className)}
        layout
      >
        <MotionIcon
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground"
          layout
          strokeWidth={2}
        />
        <span className="relative inline-grid min-w-0">
          {flashKey > 0 ? (
            <motion.span
              animate={{ opacity: 0 }}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-sm",
                flashBgClass
              )}
              initial={{ opacity: 1 }}
              key={flashKey}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          ) : null}
          <MotionNumberFlow
            className={cn(
              "relative z-1 font-mono tabular-nums transition-colors duration-200",
              toneClass
            )}
            format={{
              maximumFractionDigits: maxDecimals,
              style: "percent",
            }}
            layout
            layoutRoot
            style={
              {
                "--number-flow-mask-height": "0.3em",
              } as CSSProperties
            }
            value={ratio}
          />
        </span>
      </motion.span>
    </MotionConfig>
  );
}
