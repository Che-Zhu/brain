import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  GITHUB_OAUTH_CALLBACK_PATH,
  GITHUB_OAUTH_CODE_VERIFIER_COOKIE,
  GITHUB_OAUTH_RETURN_COOKIE,
  GITHUB_OAUTH_STATE_COOKIE,
} from "@/lib/github-oauth/constants";
import {
  applyGhcrSecretIfAuthenticated,
  clearGitHubOAuthCookies,
  exchangeGitHubOAuthCode,
  redirectToGitHubOAuthAuthorize,
} from "@/lib/github-oauth/oauth-callback";
import { parseOAuthReturnPathParam } from "@/lib/github-oauth/oauth-return-path";
import {
  buildGitHubOAuthSuccessRedirectUrl,
  getGitHubOAuthBaseUrl,
} from "@/lib/github-oauth/urls";
import { fetchServerCredentials } from "@/lib/server-credentials";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const githubError = searchParams.get("error");

  if (githubError) {
    const baseUrl = getGitHubOAuthBaseUrl(request);
    const cookieStoreForErr = await cookies();
    const storedReturnOnErr = cookieStoreForErr.get(
      GITHUB_OAUTH_RETURN_COOKIE
    )?.value;
    const response = NextResponse.redirect(
      buildGitHubOAuthSuccessRedirectUrl(baseUrl, storedReturnOnErr)
    );
    clearGitHubOAuthCookies(response);
    return response;
  }

  if (!code) {
    const returnPath = parseOAuthReturnPathParam(searchParams.get("next"));
    return redirectToGitHubOAuthAuthorize(request, { returnPath });
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(GITHUB_OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(
    GITHUB_OAUTH_CODE_VERIFIER_COOKIE
  )?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      {
        error: "invalid_state",
        error_description: "CSRF check failed. State mismatch or expired.",
      },
      { status: 400 }
    );
  }

  const baseUrl = getGitHubOAuthBaseUrl(request);
  const redirectUri = `${baseUrl}${GITHUB_OAUTH_CALLBACK_PATH}`;
  const data = await exchangeGitHubOAuthCode(
    code,
    codeVerifier ?? "",
    redirectUri
  );

  if ("error" in data) {
    const status = data.error === "server_error" ? 500 : 400;
    return NextResponse.json(
      {
        error: data.error,
        error_description: data.error_description ?? "Token exchange failed",
      },
      { status }
    );
  }

  const { serverEncodedKubeconfig } = await fetchServerCredentials();
  await applyGhcrSecretIfAuthenticated(
    serverEncodedKubeconfig,
    data.access_token
  );

  const storedReturn = cookieStore.get(GITHUB_OAUTH_RETURN_COOKIE)?.value;

  const response = NextResponse.redirect(
    buildGitHubOAuthSuccessRedirectUrl(baseUrl, storedReturn)
  );
  clearGitHubOAuthCookies(response);
  return response;
}
