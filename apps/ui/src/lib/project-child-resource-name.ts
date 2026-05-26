import { randomNano } from "@workspace/ui/lib/generator";

/** Child claim name: `{projectName}-{randomNano}` (≤63 chars, DNS label). */
export function childResourceName(projectName: string): string {
  const nano = randomNano();
  const max = 63;
  const sep = "-";
  const tail = `${sep}${nano}`;
  const cap = max - tail.length;
  const base =
    projectName.length <= cap
      ? projectName
      : projectName.slice(0, cap).replace(/-+$/g, "");
  return `${base}${tail}`;
}
