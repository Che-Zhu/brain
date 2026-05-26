const DEVBOX_REQUEST_TIMEOUT_MS = 60_000;
const DEVBOX_EXEC_REQUEST_BUFFER_MS = 10_000;

export function getDevboxExecRequestTimeoutMs(timeoutSeconds?: number): number {
  return Math.max(
    DEVBOX_REQUEST_TIMEOUT_MS,
    (timeoutSeconds ?? 60) * 1000 + DEVBOX_EXEC_REQUEST_BUFFER_MS
  );
}
