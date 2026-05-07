import { createHash, randomBytes, randomUUID } from "node:crypto";
import { applyGhcrSecret } from "@workspace/api/api.actions";
import { NextResponse } from "next/server";

import {
  GITHUB_OAUTH_CALLBACK_PATH,
  GITHUB_OAUTH_CODE_VERIFIER_COOKIE,
  GITHUB_OAUTH_RETURN_COOKIE,
  GITHUB_OAUTH_STATE_COOKIE,
} from "./constants";
import { namespaceFromKubeconfig } from "./namespace";
import { getGitHubOAuthBaseUrl } from "./urls";

const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export const GITHUB_OAUTH_SCOPES = "repo read:packages write:packages" as const;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 10,
  path: "/",
};

const TRAILING_EQ_RE = /=+$/;

export function clearGitHubOAuthCookies(response: NextResponse) {
  response.cookies.delete(GITHUB_OAUTH_STATE_COOKIE);
  response.cookies.delete(GITHUB_OAUTH_CODE_VERIFIER_COOKIE);
  response.cookies.delete(GITHUB_OAUTH_RETURN_COOKIE);
}

/** Generate PKCE code_verifier and code_challenge (S256). */
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(verifier).digest("base64");
  const challenge = hash
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(TRAILING_EQ_RE, "");
  return { verifier, challenge };
}

export function redirectToGitHubOAuthAuthorize(
  request: Request,
  options?: { returnPath?: string | null }
): NextResponse {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "GitHub OAuth app not configured",
      },
      { status: 500 }
    );
  }
  const stateVal = randomUUID();
  const { verifier, challenge } = generatePKCE();
  const baseUrl = getGitHubOAuthBaseUrl(request);
  const redirectUri = `${baseUrl}${GITHUB_OAUTH_CALLBACK_PATH}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_OAUTH_SCOPES,
    state: stateVal,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const response = NextResponse.redirect(
    `${GITHUB_AUTHORIZE_URL}?${params.toString()}`
  );
  response.cookies.set(GITHUB_OAUTH_STATE_COOKIE, stateVal, COOKIE_OPTS);
  response.cookies.set(
    GITHUB_OAUTH_CODE_VERIFIER_COOKIE,
    verifier,
    COOKIE_OPTS
  );
  const returnPath = options?.returnPath?.trim();
  if (returnPath) {
    response.cookies.set(GITHUB_OAUTH_RETURN_COOKIE, returnPath, COOKIE_OPTS);
  } else {
    response.cookies.delete(GITHUB_OAUTH_RETURN_COOKIE);
  }
  return response;
}

type TokenResult =
  | { access_token: string; scope?: string; token_type?: string }
  | { error: string; error_description?: string };

export async function exchangeGitHubOAuthCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResult> {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
    return {
      error: "server_error",
      error_description: "GitHub OAuth app not configured",
    };
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = (await res.json()) as TokenResult & {
    error_description?: string;
  };
  if (!res.ok) {
    return {
      error: "token_exchange_failed",
      error_description: data.error_description ?? res.statusText,
    };
  }
  return data;
}

function safeDecodeKubeconfig(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** Expects encoded kubeconfig from `fetchServerCredentials` (same contract as AuthBootstrap). */
export async function applyGhcrSecretIfAuthenticated(
  serverEncodedKubeconfig: string | undefined,
  accessToken: string
): Promise<void> {
  const trimmed = serverEncodedKubeconfig?.trim();
  if (!trimmed) {
    return;
  }
  try {
    const kc = safeDecodeKubeconfig(trimmed);
    if (kc === "") {
      return;
    }
    const namespace = namespaceFromKubeconfig(kc);
    const ghRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ghUser = (await ghRes.json()) as { login?: string };
    const owner = ghUser.login ?? "unknown";
    await applyGhcrSecret(kc, {
      githubToken: accessToken,
      namespace,
      owner,
    });
  } catch {
    // Caller still redirects successfully
  }
}
