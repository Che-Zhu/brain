import { NextResponse } from "next/server";

import { listGithubReposForNamespace } from "@/lib/github-oauth/connection-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const namespace = new URL(request.url).searchParams.get("namespace")?.trim();
  if (!namespace) {
    return jsonError("Missing namespace.", 400);
  }
  try {
    const repos = await listGithubReposForNamespace(namespace);
    return NextResponse.json({ repos });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load GitHub repos.",
      401
    );
  }
}
