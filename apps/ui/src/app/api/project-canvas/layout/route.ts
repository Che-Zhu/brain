import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  assertCanvasLayoutPatchMatchesOwner,
  parseCanvasLayoutGetQuery,
  parseCanvasLayoutPatchRequest,
} from "@/lib/project-canvas/layout/contract";
import {
  loadProjectCanvasLayout,
  patchProjectCanvasLayout,
} from "@/lib/project-canvas/layout/repository";
import {
  fetchServerCredentials,
  hasDevCredentialBypass,
} from "@/lib/server-credentials";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authorizeNamespace(namespace: string): Promise<Response | null> {
  if (hasDevCredentialBypass()) {
    return null;
  }

  const credentials = await fetchServerCredentials();
  if (credentials.serverEncodedKubeconfig.trim() === "") {
    return jsonError("Authentication is required.", 401);
  }
  if (credentials.serverNamespace.trim() !== namespace) {
    return jsonError("Canvas layout namespace is not accessible.", 403);
  }
  return null;
}

function validationError(error: unknown): Response | null {
  if (error instanceof ZodError) {
    return jsonError("Invalid canvas layout request.", 400);
  }
  return null;
}

export async function GET(request: NextRequest) {
  let query: ReturnType<typeof parseCanvasLayoutGetQuery>;
  try {
    query = parseCanvasLayoutGetQuery({
      namespace: request.nextUrl.searchParams.get("namespace") ?? "",
      projectUid: request.nextUrl.searchParams.get("projectUid") ?? "",
    });
  } catch (error) {
    return validationError(error) ?? jsonError("Invalid request.", 400);
  }

  const denied = await authorizeNamespace(query.namespace);
  if (denied !== null) {
    return denied;
  }

  try {
    return NextResponse.json(await loadProjectCanvasLayout(query));
  } catch {
    return jsonError("Canvas layout persistence is unavailable.", 503);
  }
}

export async function PATCH(request: NextRequest) {
  let body: ReturnType<typeof parseCanvasLayoutPatchRequest>;
  try {
    body = parseCanvasLayoutPatchRequest(await request.json());
    assertCanvasLayoutPatchMatchesOwner(body);
  } catch (error) {
    return (
      validationError(error) ?? jsonError("Invalid canvas layout request.", 400)
    );
  }

  const denied = await authorizeNamespace(body.namespace);
  if (denied !== null) {
    return denied;
  }

  try {
    const { namespace, projectUid, ...patch } = body;
    return NextResponse.json(
      await patchProjectCanvasLayout({ namespace, projectUid }, patch)
    );
  } catch {
    return jsonError("Canvas layout persistence is unavailable.", 503);
  }
}
