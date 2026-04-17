"use client";

import { getRegistryPreviewLoaderByKey } from "@registry/preview-registry";
import dynamic from "next/dynamic";

import { useRegistryPreviewVariant } from "@/hooks/use-registry-preview-variant";

export default function RegistryPreviewView({
  previewKey,
}: {
  previewKey: string;
}) {
  const { effectiveVariantId } = useRegistryPreviewVariant(previewKey);

  const loader =
    effectiveVariantId != null
      ? getRegistryPreviewLoaderByKey(previewKey, effectiveVariantId)
      : undefined;

  if (!loader) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Preview not found.</p>
      </div>
    );
  }

  const Cmp = dynamic(loader, {
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    ),
  });

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col">
        <Cmp key={`${previewKey}:${effectiveVariantId}`} />
      </div>
    </div>
  );
}
