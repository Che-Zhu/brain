const PREFIX = "[auth]";

/** Describe a secret without logging its value. */
export function secretMeta(value: string | undefined | null): string {
  const v = (value ?? "").trim();
  if (v === "") {
    return "missing";
  }
  return `present len=${v.length}`;
}

function log(level: "info" | "warn", message: string, detail?: Record<string, unknown>) {
  const suffix =
    detail && Object.keys(detail).length > 0
      ? ` ${JSON.stringify(detail)}`
      : "";
  const line = `${PREFIX}${level === "warn" ? " warn" : ""} ${message}${suffix}`;
  if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function authInfo(message: string, detail?: Record<string, unknown>): void {
  log("info", message, detail);
}

export function authWarn(message: string, detail?: Record<string, unknown>): void {
  log("warn", message, detail);
}
