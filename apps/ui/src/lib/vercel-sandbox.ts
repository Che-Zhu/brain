import "server-only";

import type { Sandbox } from "@vercel/sandbox";
import { Sandbox as SandboxRuntime } from "@vercel/sandbox";

/** Arguments to {@link SandboxRuntime.create} (resources, runtime, env, optional explicit credentials, …). */
export type VercelSandboxCreateParams = NonNullable<
  Parameters<typeof SandboxRuntime.create>[0]
>;

const DEFAULT_VCPUS = 1;

/**
 * Build `Sandbox.create` arguments using PAT env vars (`VERCEL_TEAM_ID`,
 * `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`) with a default of {@link DEFAULT_VCPUS}
 * vCPU, then apply `overrides`.
 *
 * PAT fields are read from `process.env` and may be `undefined` so the SDK can
 * fall back to OIDC (`VERCEL_OIDC_TOKEN`); types require a cast.
 */
function buildCreateParamsFromEnv(
  overrides?: Partial<VercelSandboxCreateParams>
): VercelSandboxCreateParams {
  const { resources: resourcesOverride, ...rest } = overrides ?? {};
  return {
    teamId: process.env.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_PROJECT_ID,
    token: process.env.VERCEL_TOKEN,
    ...rest,
    resources: { vcpus: DEFAULT_VCPUS, ...resourcesOverride },
  } as VercelSandboxCreateParams;
}

/**
 * PAT triple for {@link SandboxRuntime.list} / {@link SandboxRuntime.get}.
 *
 * `@vercel/sandbox` rejects a **partial** credential object (e.g. only
 * `projectId`). When all three env vars are non-empty strings, return them;
 * otherwise `{}` so the SDK falls back to OIDC (`VERCEL_OIDC_TOKEN`) like
 * {@link createVercelSandboxFromEnv}.
 */
export function vercelPatCredentialsOrEmpty(
  overrides?: Partial<VercelSandboxCreateParams>
):
  | { projectId: string; teamId: string; token: string }
  | Record<string, never> {
  const { token, teamId, projectId } = buildCreateParamsFromEnv(overrides) as {
    projectId?: string;
    teamId?: string;
    token?: string;
  };
  if (
    typeof token === "string" &&
    token !== "" &&
    typeof teamId === "string" &&
    teamId !== "" &&
    typeof projectId === "string" &&
    projectId !== ""
  ) {
    return { token, teamId, projectId };
  }
  return {};
}

/**
 * Create a Vercel Sandbox MicroVM using PAT env vars (or OIDC fallback) with
 * default resources, then `overrides` applied.
 *
 * Authentication (handled by the SDK from the environment):
 *
 * - **OIDC (recommended):** `VERCEL_OIDC_TOKEN` from `vercel link` +
 *   `vercel env pull` locally, or automatic OIDC on Vercel deployments.
 * - **Access token:** `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`
 *   for CI / non-Vercel hosts.
 *
 * @see https://vercel.com/docs/vercel-sandbox/concepts/authentication
 */
export function createVercelSandboxFromEnv(
  overrides?: Partial<VercelSandboxCreateParams>
): Promise<Sandbox & AsyncDisposable> {
  return SandboxRuntime.create(buildCreateParamsFromEnv(overrides));
}

/** Attach to an existing named sandbox (e.g. resume across invocations). */
export function getVercelSandbox(
  params: Parameters<typeof SandboxRuntime.get>[0]
): Promise<Sandbox> {
  return SandboxRuntime.get(params);
}

/** Write a UTF-8 file inside the sandbox. */
export function writeSandboxTextFile(
  sandbox: Sandbox,
  pathToFile: string,
  content: string,
  opts?: { signal?: AbortSignal }
): Promise<void> {
  return sandbox.writeFiles([{ path: pathToFile, content }], {
    signal: opts?.signal,
  });
}

/**
 * Write multiple files (paths relative to sandbox workspace unless absolute).
 * Prefer this for scripts/binaries that need an explicit `mode`.
 */
export function writeSandboxFiles(
  sandbox: Sandbox,
  files: { path: string; content: string | Uint8Array; mode?: number }[],
  opts?: { signal?: AbortSignal }
): Promise<void> {
  return sandbox.writeFiles(files, opts);
}
