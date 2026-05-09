import { listThreadsForNamespace } from "@/lib/chat-persistence/service";
import { jsonError } from "@/lib/chat-runtime/errors";

/** Threads in `?namespace=` newest-first. */
export async function GET(req: Request) {
  const namespaceRaw = new URL(req.url).searchParams.get("namespace") ?? "";
  try {
    const threads = await listThreadsForNamespace(namespaceRaw);
    return Response.json({ threads });
  } catch (error) {
    console.error("[api/chat/threads]", error);
    return jsonError(
      "Assistant chat persistence is unavailable (check DATABASE_URL).",
      503
    );
  }
}
