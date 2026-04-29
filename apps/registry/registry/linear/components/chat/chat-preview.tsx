"use client";

import { Button } from "@workspace/ui/components/button";
import { Chat, type UIMessage } from "@workspace/ui/components/chat/chat";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { PanelRightClose } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const threadAId = "thread-a";
const threadBId = "thread-b";

const seedMessages: Record<string, UIMessage[]> = {
  [threadAId]: [
    {
      id: "mock-1",
      role: "user",
      parts: [{ type: "text", text: "Example prompt — no backend wired yet." }],
    },
    {
      id: "mock-2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Placeholder reply. Hook `onSend` and message state to your chat API when ready.",
        },
      ],
    },
  ],
  [threadBId]: [
    {
      id: "mock-3",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Second thread — switch via the title dropdown.",
        },
      ],
    },
    {
      id: "mock-4",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Same **Chat.ThreadSelect** as production when `threadHistory` is passed.",
        },
      ],
    },
  ],
};

function ChatWorkspacePreview() {
  const [activeThreadId, setActiveThreadId] = useState(threadAId);
  const [messagesByThread, setMessagesByThread] = useState(seedMessages);
  const [inputValue, setInputValue] = useState("");

  const threadName = activeThreadId === threadAId ? "Onboarding" : "Quick ask";
  const messages = messagesByThread[activeThreadId] ?? [];

  const appendUserAndStubAssistant = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      const userMsg: UIMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] ?? []), userMsg],
      }));
      setInputValue("");
      window.setTimeout(() => {
        const reply: UIMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Stub reply — wire `onSend` to your model.",
            },
          ],
        };
        setMessagesByThread((p) => ({
          ...p,
          [activeThreadId]: [...(p[activeThreadId] ?? []), reply],
        }));
      });
    },
    [activeThreadId]
  );

  return (
    <div className="flex h-[min(32rem,70vh)] w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <Chat.Root
        header={{
          actions: {
            onExport: () => undefined,
            onNewThread: () => setActiveThreadId(threadAId),
            threadHistory: {
              activeThreadId,
              items: [
                { id: threadAId, title: "Onboarding", updatedAt: "2h" },
                { id: threadBId, title: "Quick ask", updatedAt: "Yesterday" },
              ],
              onSelect: setActiveThreadId,
            },
          },
          states: {
            threadName,
          },
        }}
        messages={{
          states: { messages, status: undefined },
        }}
        onSend={appendUserAndStubAssistant}
        onValueChange={setInputValue}
        value={inputValue}
      >
        <Chat className="h-full min-h-0 flex-1 border-0 shadow-none">
          <Chat.Header
            className="shrink-0"
            trailing={
              <Button
                aria-label="Close panel (preview — no action)"
                className="hoverable rounded-xl"
                onClick={() => undefined}
                size="icon-lg"
                type="button"
                variant="ghost"
              >
                <PanelRightClose
                  aria-hidden
                  className="size-4"
                  strokeWidth={2}
                />
              </Button>
            }
          />
          <Chat.Transcript className="min-h-0 flex-1" />
          <div className="shrink-0 border-border p-2">
            <Chat.Composer placeholder="Message…" />
          </div>
        </Chat>
      </Chat.Root>
    </div>
  );
}

function ChatSubmittedRowPreview() {
  const messages: UIMessage[] = useMemo(
    () => [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "Generate a short poem." }],
      },
    ],
    []
  );

  return (
    <div className="h-56 w-full overflow-hidden rounded-xl border border-border bg-background">
      <Chat.Root
        header={{
          actions: {
            onExport: () => undefined,
            onNewThread: () => undefined,
          },
          states: {
            threadName: "Submitted",
          },
        }}
        messages={{ states: { messages, status: "submitted" } }}
      >
        <Chat className="h-full min-h-0 flex-1 border-0 shadow-none">
          <Chat.Header className="shrink-0" />
          <Chat.Transcript className="min-h-0 flex-1" />
        </Chat>
      </Chat.Root>
    </div>
  );
}

export default function ChatPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Project pane — thread dropdown + toolbar">
        <ChatWorkspacePreview />
      </Preview>
      <Preview title="Transcript — submitted (loading row)">
        <ChatSubmittedRowPreview />
      </Preview>
    </PreviewWrapper>
  );
}
