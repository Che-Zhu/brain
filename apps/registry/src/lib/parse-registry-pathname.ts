/**
 * Parses `/registry/{style}/{group}/{name}` from the pathname (App Router URL).
 */
export function parseRegistryPathname(pathname: string): {
  style: string;
  group: string;
  name: string;
} | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "registry" || parts.length < 4) {
    return null;
  }
  return {
    style: parts[1],
    group: parts[2],
    name: decodeURIComponent(parts[3]),
  };
}
