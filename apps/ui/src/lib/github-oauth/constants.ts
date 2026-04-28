/** Must match `packages/api/src/api.actions.ts` (YAML secret name). */
export const GHCR_CRED_SECRET_NAME = "ghcr-cred" as const;

/** StringData/data key holding the PAT — must match `packages/api/src/api.actions.ts`. */
export const GHCR_CRED_TOKEN_KEY = "githubToken" as const;

/** Must match `app/api/callback/github/route.ts` and the GitHub OAuth app callback URL. */
export const GITHUB_OAUTH_CALLBACK_PATH = "/api/callback/github" as const;

export const GITHUB_OAUTH_STATE_COOKIE = "github_oauth_state" as const;
export const GITHUB_OAUTH_CODE_VERIFIER_COOKIE =
  "github_oauth_code_verifier" as const;
