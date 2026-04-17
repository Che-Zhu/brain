"use client";

import { getRegistryPreviewVariantOptions } from "@registry/preview-registry";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo } from "react";

function newestVariantId(options: { id: string }[]): string {
  const last = options.at(-1);
  if (!last) {
    throw new Error("newestVariantId: expected non-empty options");
  }
  return last.id;
}

/**
 * Syncs `?variant=` with the registry preview entry for the current route.
 * Single-variant entries clear the param. Multi-variant entries default to the **newest**
 * (last registered) variant when missing or invalid.
 */
export function useRegistryPreviewVariant(previewKey: string | null) {
  const options = useMemo(
    () => (previewKey ? getRegistryPreviewVariantOptions(previewKey) : []),
    [previewKey]
  );
  const [variantParam, setVariantParam] = useQueryState(
    "variant",
    parseAsString
  );

  const effectiveVariantId = useMemo(() => {
    if (options.length === 0) {
      return null;
    }
    if (variantParam && options.some((o) => o.id === variantParam)) {
      return variantParam;
    }
    return newestVariantId(options);
  }, [options, variantParam]);

  useEffect(() => {
    if (options.length === 0) {
      if (variantParam != null) {
        Promise.resolve(setVariantParam(null)).catch(() => undefined);
      }
      return;
    }
    if (options.length === 1) {
      if (variantParam != null) {
        Promise.resolve(setVariantParam(null)).catch(() => undefined);
      }
      return;
    }
    if (!(variantParam && options.some((o) => o.id === variantParam))) {
      Promise.resolve(setVariantParam(newestVariantId(options))).catch(
        () => undefined
      );
    }
  }, [options, setVariantParam, variantParam]);

  return {
    options,
    showVariantSwitcher: options.length > 1,
    effectiveVariantId,
    setVariantId: setVariantParam,
  };
}
