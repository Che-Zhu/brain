"use client";

import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { cn } from "@workspace/ui/lib/utils";
import { type LucideIcon, Settings2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function ResourceSettingsSection({
  actions,
  children,
  className,
  icon: Icon = Settings2,
  title,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  actions?: ReactNode;
  icon?: LucideIcon;
  title: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-transparent",
        className
      )}
      {...props}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-border border-b px-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon aria-hidden className="size-4 shrink-0 text-card-foreground" />
          <h3 className="truncate font-medium text-card-foreground text-sm leading-5">
            {title}
          </h3>
        </div>
        {actions == null ? null : (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </header>
      <div className="flex min-w-0 flex-col gap-3 px-2.5 pb-3">{children}</div>
    </section>
  );
}

export function ResourceSettingsInset({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("rounded-lg bg-database-metrics-card p-2.5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ResourceSettingsSlider({
  ariaLabel,
  disabled,
  formatBound,
  formatValue,
  icon,
  label,
  max,
  maxDecimals,
  min,
  onValueChange,
  step,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  formatBound?: (value: number) => ReactNode;
  formatValue: (value: number) => ReactNode;
  icon?: LucideIcon;
  label: string;
  max: number;
  maxDecimals: number;
  min: number;
  onValueChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const Icon = icon;
  const boundFormatter = formatBound ?? String;

  return (
    <ResourceSettingsInset>
      <ScaleSlider.Root
        disabled={disabled}
        max={max}
        maxDecimals={maxDecimals}
        min={min}
        onValueChange={onValueChange}
        step={step}
        value={value}
        valueDisplay="number"
      >
        <ScaleSlider.Stack className="w-full gap-1.5">
          <ScaleSlider.Header className="mb-0.5 h-9">
            <ScaleSlider.Group className="min-w-0 gap-1.5">
              {Icon == null ? null : (
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              )}
              <ScaleSlider.Label className="truncate text-muted-foreground text-sm leading-5">
                {label}
              </ScaleSlider.Label>
            </ScaleSlider.Group>
            <span className="shrink-0 text-primary text-sm leading-5">
              {formatValue(value)}
            </span>
          </ScaleSlider.Header>
          <ScaleSlider.Control aria-label={ariaLabel} className="h-2">
            <ScaleSlider.Track className="h-2 bg-input/80">
              <ScaleSlider.Range className="bg-gradient-to-r from-blue-950 to-theme-blue" />
            </ScaleSlider.Track>
            <ScaleSlider.Thumb className="size-4 border-2 border-primary bg-theme-blue shadow-none ring-0" />
          </ScaleSlider.Control>
          <div className="flex min-w-0 items-center justify-between gap-3 text-muted-foreground text-sm leading-5">
            <span className="truncate">{boundFormatter(min)}</span>
            <span className="truncate text-right">{boundFormatter(max)}</span>
          </div>
        </ScaleSlider.Stack>
      </ScaleSlider.Root>
    </ResourceSettingsInset>
  );
}
