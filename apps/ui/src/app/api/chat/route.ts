import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { resolveChatOpenAiConnection } from "@/lib/ai-proxy/resolve-chat-open-ai-connection";
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
import { attachToolDurationMetrics } from "@/lib/chat-runtime/attach-tool-duration-metrics";
import { jsonError } from "@/lib/chat-runtime/errors";
import { createInjectToolDurationStreamTransform } from "@/lib/chat-runtime/inject-tool-duration-stream";
import { decodeKubeconfig } from "@/lib/chat-runtime/kubeconfig";
import {
  CHAT_MAX_STEPS,
  chatLanguageModel,
  threadTitleLanguageModel,
} from "@/lib/chat-runtime/model";
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

  const { assistantContext, chatId, encodedKubeconfig, message, namespace } =
    parsed.data;

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
    const { tools, systemPrompt } = await buildChatToolset({
      assistantContext,
      kubeconfig,
      kubernetesNamespace: namespace,
    });

    const openAi = await resolveChatOpenAiConnection({
      encodedKubeconfig,
      kubeconfigText: kubeconfig,
    });
    if (!openAi.ok) {
      return jsonError(openAi.message, openAi.status);
    }
    const model = chatLanguageModel(openAi.connection);
    const titleModel = threadTitleLanguageModel(openAi.connection);

    const toolDurationMsByCallId = new Map<string, number>();

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(history, { tools }),
      tools,
      stopWhen: stepCountIs(CHAT_MAX_STEPS),
      experimental_transform: createInjectToolDurationStreamTransform(
        toolDurationMsByCallId
      ),
      experimental_onToolCallFinish: (event) => {
        toolDurationMsByCallId.set(event.toolCall.toolCallId, event.durationMs);
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: history,
      onFinish: async ({ responseMessage }) => {
        try {
          await appendMessage(
            chatId,
            attachToolDurationMetrics(responseMessage, toolDurationMsByCallId)
          );
          await maybeAutoTitleThread({
            chatId,
            languageModel: titleModel,
          });
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
