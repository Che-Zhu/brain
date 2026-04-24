/** Maps 0–100% usage to theme text classes (see `globals.css` `--color-theme-*`). */
export function usagePercentToneClass(value: number): string {
  if (!Number.isFinite(value)) {
    return "text-theme-gray";
  }
  if (value > 90) {
    return "text-theme-red";
  }
  if (value >= 75) {
    return "text-theme-yellow";
  }
  return "text-theme-green";
}

export function clampScale(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
