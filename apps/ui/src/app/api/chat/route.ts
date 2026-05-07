import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  buildEmitGenUISpecDescription,
  executeEmitGenUISpec,
  genUISpecInputSchema,
} from "@workspace/ui/lib/gen-ui-tool";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";

const emitGenUISpec = tool({
  description: buildEmitGenUISpecDescription(),
  inputSchema: genUISpecInputSchema,
  execute: executeEmitGenUISpec,
});

const provider = createOpenAICompatible({
  name: "openai",
  apiKey: process.env.DEV_OPENAI_API_KEY,
  baseURL: process.env.DEV_OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  includeUsage: true,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: provider("gpt-4o-mini"),
    system:
      "You are a helpful assistant for the product UI. When you need to show catalog-driven UI (metrics chart, etc.), call `emitGenUISpec` with a valid spec. You may still reply with normal text before or after.",
    messages: await convertToModelMessages(messages, {
      tools: {
        emitGenUISpec,
      },
    }),
    tools: {
      emitGenUISpec,
    },
    stopWhen: stepCountIs(15),
  });

  return result.toUIMessageStreamResponse();
}
