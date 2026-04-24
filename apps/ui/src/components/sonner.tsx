"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, Link2 } from "lucide-react";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyableProjectShareToast({
  shareUrl,
  projectName,
  toastId,
}: {
  projectName?: string;
  shareUrl: string;
  toastId: string | number;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    if (copied) {
      return;
    }
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
    }
  }, [copied, shareUrl]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const t = window.setTimeout(() => {
      toast.dismiss(toastId);
    }, 2000);
    return () => clearTimeout(t);
  }, [copied, toastId]);

  const title = copied ? "Link copied" : "Click to copy share link";
  const subtitle =
    projectName != null && projectName !== "" ? projectName : "Preview link";

  return (
    <button
      className={cn(
        "cn-toast w-full min-w-0 max-w-md rounded-lg border border-border bg-popover p-3 text-left text-popover-foreground text-sm shadow-lg transition-[background-color,box-shadow]",
        "hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        copied && "pointer-events-none"
      )}
      disabled={copied}
      onClick={handle}
      type="button"
    >
      <div className="flex min-w-0 items-start gap-2">
        {copied ? (
          <Check
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-emerald-500"
            strokeWidth={2.5}
          />
        ) : (
          <Link2
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">{title}</div>
          <div className="mt-0.5 text-muted-foreground text-xs">{subtitle}</div>
          <div
            className="mt-1.5 min-w-0 max-w-full truncate font-mono text-muted-foreground text-xs"
            title={shareUrl}
          >
            {shareUrl}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Long-lived preview share link toast; the whole area copies the URL on click.
 * Use after a successful `POST /api/projects/v1alpha1/share` from the app.
 */
export function toastCopyableProjectShareLink(
  shareUrl: string,
  options?: { projectName?: string }
): string | number {
  return toast.custom(
    (id) => (
      <CopyableProjectShareToast
        projectName={options?.projectName}
        shareUrl={shareUrl}
        toastId={id}
      />
    ),
    { duration: 30_000 }
  );
}
