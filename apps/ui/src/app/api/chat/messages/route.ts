import { loadMessagesInNamespace } from "@/lib/chat-persistence/service";
import { jsonError } from "@/lib/chat-runtime/errors";

/** Full ordered history for `?chatId=` (and `?namespace=` for access control). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get("chatId")?.trim();
  const namespaceRaw = url.searchParams.get("namespace") ?? "";
  if (!chatId) {
    return jsonError("chatId query parameter required", 400);
  }

  try {
    const messages = await loadMessagesInNamespace(chatId, namespaceRaw);
    if (messages == null) {
      return Response.json(
        { error: "Thread not found for this namespace", messages: [] },
        { status: 404 }
      );
    }
    return Response.json({ messages });
  } catch (error) {
    console.error("[api/chat/messages]", error);
    return Response.json({
      messages: [],
      error: "Assistant chat persistence is unavailable (check DATABASE_URL).",
    });
  }
}
