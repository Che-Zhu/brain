"use client";

import { Pause, Play } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LivePauseToggleProps {
  isLive: boolean;
  onToggle: () => void;
}

export function LivePauseToggle({ isLive, onToggle }: LivePauseToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={`flex h-8 w-8 items-center justify-center rounded-md border shadow-xs ${isLive ? "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" : "border-input bg-background hover:bg-accent hover:text-accent-foreground"}`}
        onClick={onToggle}
        type="button"
      >
        {isLive ? <Pause className="size-4" /> : <Play className="size-4" />}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isLive ? "Pause" : "Resume"}
      </TooltipContent>
    </Tooltip>
  );
}
