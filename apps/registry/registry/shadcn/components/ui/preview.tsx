"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PreviewWrapper({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <div
        className={cn(
          "mx-auto grid w-full min-w-0 max-w-7xl auto-rows-auto content-start items-stretch gap-8 p-4 pt-2 sm:gap-12 sm:p-6 md:gap-8 lg:p-12 2xl:max-w-6xl",
          className
        )}
        data-slot="preview-wrapper"
      >
        {children}
      </div>
    </div>
  );
}

function Preview({
  title,
  children,
  className,
  containerClassName,
  showReset = true,
  onReset,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  showReset?: boolean;
  /** Called when the user resets the preview (after remount key bumps). */
  onReset?: () => void;
}) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-col gap-1 self-stretch lg:max-w-none",
        containerClassName
      )}
      data-slot="preview"
    >
      <div className="flex items-center gap-1 px-1.5 py-2">
        <span className="font-medium text-muted-foreground text-xs">
          {title}
        </span>
        {showReset ? (
          <Button
            aria-label="Reset preview"
            className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => {
              setResetKey((k) => k + 1);
              onReset?.();
              toast(`Preview Reset: ${title}`);
            }}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-col items-stretch gap-6 border border-dashed bg-background p-4 text-foreground sm:p-6 *:[div:not([class*='w-'])]:w-full",
          className
        )}
        data-slot="preview-content"
        key={resetKey}
      >
        {children}
      </div>
    </div>
  );
}

export { PreviewWrapper, Preview };
