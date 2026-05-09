import type { UIMessage } from "ai";
import { z } from "zod";

/** Postgres schema name. Shared between drizzle tables and `instrumentation.ts` bootstrap. */
export const ASSISTANT_DB_SCHEMA = "sealai_assistant";

/** Bucket key for threads created without an explicit kube namespace. */
export const DEFAULT_ASSISTANT_NAMESPACE_KEY = "__default__" as const;

/** Trim and bucket empty namespaces so they aggregate under one key. */
export function normalizeAssistantNamespace(namespace: string): string {
  const trimmed = namespace.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_ASSISTANT_NAMESPACE_KEY;
}

/** Wire shape for a thread row sent to the client. */
export interface AssistantThreadDTO {
  id: string;
  namespace: string;
  title: string;
  updatedAt: string;
}

export const assistantThreadDTOSchema = z.object({
  id: z.string(),
  namespace: z.string(),
  title: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<AssistantThreadDTO>;

/** Bootstrap payload returned by `GET /api/chat/session`. */
export interface AssistantSessionPayload {
  chatId: string;
  messages: UIMessage[];
  threads: AssistantThreadDTO[];
}

/** Body of `POST /api/chat`. */
export const chatStreamRequestSchema = z.object({
  chatId: z.string().min(1),
  namespace: z.string(),
  message: z.unknown(),
  encodedKubeconfig: z.string().optional(),
});
export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;

/** Body of `POST /api/chat/thread`. */
export const createThreadBodySchema = z.object({
  namespace: z.string().optional(),
});

/** Server-side narrowing for the AI SDK `UIMessage` payloads we accept across the wire. */
export function isPersistedUIMessage(value: unknown): value is UIMessage {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.role === "user" || m.role === "assistant" || m.role === "system") &&
    Array.isArray(m.parts)
  );
}
