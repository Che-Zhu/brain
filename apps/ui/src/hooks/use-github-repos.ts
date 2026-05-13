"use client";

import { fetcher } from "@workspace/api/fetch";
import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
import useSWR from "swr";

const GITHUB_API = "https://api.github.com";

const repoHeaders = (token: string) =>
  ({
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }) as const;

function asRepos(payload: unknown): GithubDeployerRepo[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.flatMap((row) => {
    if (row === null || typeof row !== "object") {
      return [];
    }
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== "number" ||
      typeof r.name !== "string" ||
      typeof r.full_name !== "string"
    ) {
      return [];
    }
    return [
      { id: String(r.id), name: r.name, fullName: r.full_name },
    ] satisfies GithubDeployerRepo[];
  });
}

async function fetchAllUserRepos(token: string): Promise<GithubDeployerRepo[]> {
  const header = repoHeaders(token);
  const out: GithubDeployerRepo[] = [];
  const perPage = 100;

  for (let page = 1; page <= 5; page += 1) {
    const batch = await fetcher<unknown>({
      base: GITHUB_API,
      header,
      path: "/user/repos",
      query: { page, per_page: perPage, sort: "updated" },
    });
    const slice = asRepos(batch);
    if (slice.length === 0) {
      break;
    }
    out.push(...slice);
    if (slice.length < perPage) {
      break;
    }
  }

  return out;
}

/**
 * Loads repositories for the authenticated user from the GitHub REST API.
 * Skips the request until `githubToken` is non-empty after trim.
 */
export function useGithubRepos(githubToken: string | undefined) {
  const token = githubToken?.trim() ?? "";
  const swrKey = token === "" ? null : (["github-user-repos", token] as const);

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => fetchAllUserRepos(token),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  let errOut: Error | undefined;
  if (error != null) {
    errOut = error instanceof Error ? error : new Error(String(error));
  }

  return {
    error: errOut,
    isLoading: swrKey !== null && isLoading,
    mutate,
    repos: data ?? [],
  };
}
