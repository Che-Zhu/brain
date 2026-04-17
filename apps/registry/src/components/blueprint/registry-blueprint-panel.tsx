"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { BlueprintImageGrid } from "@/components/blueprint/blueprint-image-grid";
import { useRegistryPreviewVariant } from "@/hooks/use-registry-preview-variant";
import { parseRegistryPathname } from "@/lib/parse-registry-pathname";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; images: string[] }
  | { status: "error" };

export function RegistryBlueprintPanel({ className }: { className?: string }) {
  const pathname = usePathname();
  const route = parseRegistryPathname(pathname);
  const previewKey = useMemo(() => {
    const parsed = parseRegistryPathname(pathname);
    return parsed ? `${parsed.style}/${parsed.group}/${parsed.name}` : null;
  }, [pathname]);
  const { effectiveVariantId } = useRegistryPreviewVariant(previewKey);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    const parsed = parseRegistryPathname(pathname);
    if (!parsed) {
      setState({ status: "idle" });
      return;
    }

    const { style, group, name } = parsed;
    const params = new URLSearchParams({ style, group, name });
    if (
      effectiveVariantId != null &&
      effectiveVariantId !== "" &&
      effectiveVariantId !== "default"
    ) {
      params.set("variant", effectiveVariantId);
    }
    setState({ status: "loading" });

    let cancelled = false;

    fetch(`/api/registry/blueprint?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load blueprint assets");
        }
        return res.json() as Promise<{ images: string[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ok", images: data.images });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, effectiveVariantId]);

  if (!route) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground text-sm",
          className
        )}
        data-slot="registry-blueprint-no-context"
      >
        <p className="font-medium text-foreground">Blueprint</p>
        <p className="max-w-sm text-balance">
          Open a registry preview from the sidebar to view blueprint images for
          that entry.
        </p>
      </div>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col items-center justify-center p-8",
          className
        )}
        data-slot="registry-blueprint-loading"
      >
        <div className="flex w-full max-w-3xl flex-col items-center gap-4">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                className="aspect-video animate-pulse rounded-lg bg-muted"
                key={i}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground text-sm",
          className
        )}
        data-slot="registry-blueprint-error"
      >
        <p className="font-medium text-destructive">Could not load blueprint</p>
        <p className="max-w-sm text-balance">
          Try again, or check that the preview route is valid.
        </p>
      </div>
    );
  }

  if (state.images.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground text-sm",
          className
        )}
        data-slot="registry-blueprint-empty"
      >
        <p className="font-medium text-foreground">No blueprint yet</p>
        <p className="max-w-sm text-balance">
          Add image files (PNG, JPG, WebP, SVG, GIF, or AVIF) under{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
            public/registry/{route.style}/{route.group}/{route.name}/
          </code>
          , or per variant under{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
            …/{route.name}/&lt;variant&gt;/
          </code>{" "}
          (e.g. <span className="font-mono">v0</span>,{" "}
          <span className="font-mono">v1</span>). Variant folders take
          precedence when present.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-0 flex-1", className)}
      data-slot="registry-blueprint-gallery"
    >
      <BlueprintImageGrid urls={state.images} />
    </div>
  );
}
