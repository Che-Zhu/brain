import { createThreadForNamespace } from "@/lib/chat-persistence/service";
import { createThreadBodySchema } from "@/lib/chat-persistence/types";
import { jsonError } from "@/lib/chat-runtime/errors";

/** Create an empty assistant thread; returns the new id and refreshed thread list. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body == null) {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createThreadBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid body", 400, parsed.error.flatten());
  }

  try {
    const result = await createThreadForNamespace(parsed.data.namespace ?? "");
    return Response.json(result);
  } catch (error) {
    console.error("[api/chat/thread]", error);
    return jsonError("Could not create thread (DATABASE_URL).", 503);
  }
}
