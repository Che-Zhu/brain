import { convertToModelMessages, stepCountIs, streamText } from "ai";

import {
  appendMessage,
  loadThreadMessages,
  maybeAutoTitleThread,
  threadBelongsToNamespace,
} from "@/lib/chat-persistence/service";
import {
  chatStreamRequestSchema,
  isPersistedUIMessage,
} from "@/lib/chat-persistence/types";
import { jsonError } from "@/lib/chat-runtime/errors";
import { decodeKubeconfig } from "@/lib/chat-runtime/kubeconfig";
import { CHAT_MAX_STEPS, chatLanguageModel } from "@/lib/chat-runtime/model";
import { buildChatToolset } from "@/lib/chat-runtime/tools";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body == null) {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = chatStreamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid chat request", 400, parsed.error.flatten());
  }

  const { chatId, message, encodedKubeconfig, namespace } = parsed.data;

  if (!isPersistedUIMessage(message)) {
    return jsonError("Malformed UI message payload", 400);
  }

  const kubeconfig = decodeKubeconfig(encodedKubeconfig);
  if (kubeconfig == null) {
    return jsonError("Missing or invalid kubeconfig", 400);
  }

  try {
    if (!(await threadBelongsToNamespace(chatId, namespace))) {
      return jsonError(
        "Unknown or inaccessible assistant thread for this namespace.",
        403
      );
    }

    await appendMessage(chatId, message);
    const history = await loadThreadMessages(chatId);
    const { tools, systemPrompt } = await buildChatToolset({ kubeconfig });
    const model = chatLanguageModel();

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(history, { tools }),
      tools,
      stopWhen: stepCountIs(CHAT_MAX_STEPS),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: history,
      onFinish: async ({ responseMessage }) => {
        try {
          await appendMessage(chatId, responseMessage);
          await maybeAutoTitleThread({ chatId, languageModel: model });
        } catch (error) {
          console.error("[api/chat] persist assistant turn:", error);
        }
      },
    });
  } catch (error) {
    console.error("[api/chat] pipeline:", error);
    return jsonError(
      "Could not handle chat request (DATABASE_URL, drizzle db:push, or upstream).",
      503
    );
  }
}
