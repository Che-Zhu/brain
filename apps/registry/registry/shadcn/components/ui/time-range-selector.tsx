"use client";

import { format } from "date-fns";
import { ChevronDown, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@shadcn/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shadcn/ui/popover";

export type TimeRange =
  | { mode: "quick"; ms: number }
  | { mode: "custom"; start: Date; end: Date };

export const QUICK_RANGES = [
  { label: "Last 5 min", short: "Last 5m", ms: 5 * 60_000 },
  { label: "Last 15 min", short: "Last 15m", ms: 15 * 60_000 },
  { label: "Last 30 min", short: "Last 30m", ms: 30 * 60_000 },
  { label: "Last 1 hour", short: "Last 1h", ms: 60 * 60_000 },
  { label: "Last 3 hours", short: "Last 3h", ms: 3 * 60 * 60_000 },
  { label: "Last 6 hours", short: "Last 6h", ms: 6 * 60 * 60_000 },
];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export function TimeRangeSelector({
  value,
  onChange,
  className,
}: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [draftStartTime, setDraftStartTime] = useState("00:00:00");
  const [draftEndTime, setDraftEndTime] = useState("23:59:59");

  useEffect(() => {
    if (!open) {
      return;
    }
    if (value.mode === "custom") {
      setDraftRange({ from: value.start, to: value.end });
      setDraftStartTime(format(value.start, "HH:mm:ss"));
      setDraftEndTime(format(value.end, "HH:mm:ss"));
    } else {
      const now = new Date();
      const from = new Date(now.getTime() - value.ms);
      setDraftRange({ from, to: now });
      setDraftStartTime(format(from, "HH:mm:ss"));
      setDraftEndTime(format(now, "HH:mm:ss"));
    }
  }, [open, value]);

  function handleConfirm() {
    if (!(draftRange?.from && draftRange?.to)) {
      return;
    }
    const startParts = draftStartTime.split(":").map(Number);
    const endParts = draftEndTime.split(":").map(Number);
    const start = new Date(draftRange.from);
    start.setHours(
      startParts[0] ?? 0,
      startParts[1] ?? 0,
      startParts[2] ?? 0,
      0
    );
    const end = new Date(draftRange.to);
    end.setHours(endParts[0] ?? 23, endParts[1] ?? 59, endParts[2] ?? 59, 999);
    onChange({ mode: "custom", start, end });
    setOpen(false);
  }

  function handleQuickRange(ms: number) {
    onChange({ mode: "quick", ms });
    setOpen(false);
  }

  const triggerLabel =
    value.mode === "quick"
      ? (QUICK_RANGES.find((r) => r.ms === value.ms)?.label ?? "Custom")
      : "Custom";

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground",
          className
        )}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex">
          <div className="flex flex-col gap-3 border-r p-3">
            <Calendar
              mode="range"
              numberOfMonths={1}
              onSelect={setDraftRange}
              selected={draftRange}
            />
            <div className="flex items-center gap-2 px-1 text-sm">
              <label className="text-muted-foreground">Start</label>
              <input
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                onChange={(e) => setDraftStartTime(e.target.value)}
                step="1"
                type="time"
                value={draftStartTime}
              />
            </div>
            <div className="flex items-center gap-2 px-1 text-sm">
              <label className="text-muted-foreground">End&nbsp;&nbsp;</label>
              <input
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                onChange={(e) => setDraftEndTime(e.target.value)}
                step="1"
                type="time"
                value={draftEndTime}
              />
            </div>
            <div className="flex justify-end gap-2 px-1">
              <Button
                onClick={() => setOpen(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!(draftRange?.from && draftRange?.to)}
                onClick={handleConfirm}
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-3">
            <span className="mb-1 font-medium text-muted-foreground text-xs">
              Relative
            </span>
            {QUICK_RANGES.map((r) => (
              <button
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent",
                  value.mode === "quick" &&
                    value.ms === r.ms &&
                    "bg-accent font-medium"
                )}
                key={r.ms}
                onClick={() => handleQuickRange(r.ms)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
