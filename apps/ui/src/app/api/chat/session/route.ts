import { bootstrapAssistantSession } from "@/lib/chat-persistence/service";
import { jsonError } from "@/lib/chat-runtime/errors";

/** Latest thread + messages + thread list for `?namespace=`. Creates one when none exists. */
export async function GET(req: Request) {
  const namespaceRaw = new URL(req.url).searchParams.get("namespace") ?? "";
  try {
    return Response.json(await bootstrapAssistantSession(namespaceRaw));
  } catch (error) {
    console.error("[api/chat/session]", error);
    return jsonError(
      "Could not load assistant session (database / DATABASE_URL).",
      503
    );
  }
}
