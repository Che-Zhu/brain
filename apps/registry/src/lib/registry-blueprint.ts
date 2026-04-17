import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
]);

function isSafeSegment(segment: string): boolean {
  if (segment.length === 0 || segment.length > 128) {
    return false;
  }
  if (
    segment.includes("..") ||
    segment.includes("/") ||
    segment.includes("\\")
  ) {
    return false;
  }
  return true;
}

function listImageFilenamesInDir(absDir: string): Promise<string[]> {
  return readdir(absDir, { withFileTypes: true })
    .then((entries) =>
      entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((filename) => {
          const ext = path.extname(filename).toLowerCase();
          return IMAGE_EXT.has(ext);
        })
        .sort((a, b) => a.localeCompare(b))
    )
    .catch(() => []);
}

function publicRegistryImageUrls(
  style: string,
  group: string,
  name: string,
  variant: string | null,
  filenames: string[]
): string[] {
  const base = `/registry/${encodeURIComponent(style)}/${encodeURIComponent(group)}/${encodeURIComponent(name)}`;
  const prefix =
    variant != null ? `${base}/${encodeURIComponent(variant)}` : base;
  return filenames.map(
    (filename) => `${prefix}/${encodeURIComponent(filename)}`
  );
}

/**
 * Lists blueprint images for a registry preview.
 * With `variant` (not `"default"`): tries `public/registry/{style}/{group}/{name}/{variant}/` first;
 * if that folder is missing or has no images, falls back to `.../{name}/`.
 * Without variant / `default`: only `public/registry/{style}/{group}/{name}/`.
 */
export async function listRegistryBlueprintImages(
  style: string,
  group: string,
  name: string,
  variant?: string | null
): Promise<string[]> {
  if (!(isSafeSegment(style) && isSafeSegment(group) && isSafeSegment(name))) {
    return [];
  }

  const baseDir = path.join(
    process.cwd(),
    "public",
    "registry",
    style,
    group,
    name
  );

  const useVariantFolder =
    variant != null &&
    variant !== "" &&
    variant !== "default" &&
    isSafeSegment(variant);

  if (useVariantFolder) {
    const variantDir = path.join(baseDir, variant);
    const variantFiles = await listImageFilenamesInDir(variantDir);
    if (variantFiles.length > 0) {
      return publicRegistryImageUrls(style, group, name, variant, variantFiles);
    }
  }

  const baseFiles = await listImageFilenamesInDir(baseDir);
  return publicRegistryImageUrls(style, group, name, null, baseFiles);
}
