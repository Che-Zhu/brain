"use client";

import {
  Chat,
  type ChatHeaderStates,
  type ChatHeaderThreadHistory,
  type UIMessage,
} from "@workspace/ui/components/chat/chat";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { useCallback, useMemo, useState } from "react";

const threadAId = "thread-a";
const threadBId = "thread-b";

const seedMessages: Record<string, UIMessage[]> = {
  [threadAId]: [
    {
      id: "m1",
      role: "user",
      parts: [
        { type: "text", text: "Summarize what this registry preview shows." },
      ],
    },
    {
      id: "m2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "It demonstrates **Chat.Root** with shared context: compose **Chat.Header**, **Chat.Transcript**, and **Chat.Composer** (or smaller pieces like **Chat.Breadcrumb**, **Chat.ComposerTextarea**).",
        },
      ],
    },
  ],
  [threadBId]: [
    {
      id: "m3",
      role: "user",
      parts: [{ type: "text", text: "Shorter reply please." }],
    },
    {
      id: "m4",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "One provider; slice hooks: useChatHeader, useChatMessages, useChatInput.",
        },
      ],
    },
  ],
};

function ChatWorkspacePreview() {
  const [activeThreadId, setActiveThreadId] = useState(threadAId);
  const [messagesByThread, setMessagesByThread] = useState(seedMessages);
  const [inputValue, setInputValue] = useState("");

  const messages = messagesByThread[activeThreadId] ?? [];

  const headerStates: ChatHeaderStates = useMemo(
    () => ({
      breadcrumbParentHref: "#",
      breadcrumbParentLabel: "Assistants",
      characterName: "Registry preview",
      threadName: activeThreadId === threadAId ? "Onboarding" : "Quick ask",
    }),
    [activeThreadId]
  );

  const threadHistory: ChatHeaderThreadHistory = useMemo(
    () => ({
      activeThreadId,
      items: [
        { id: threadAId, title: "Onboarding", updatedAt: "2h" },
        { id: threadBId, title: "Quick ask", updatedAt: "Yesterday" },
      ],
      onSelect: setActiveThreadId,
    }),
    [activeThreadId]
  );

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
              text: "Stub assistant reply — wire `onSend` to your model stream.",
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
            onSettings: () => undefined,
            threadHistory,
          },
          states: headerStates,
        }}
        messages={{ states: { messages, status: undefined } }}
        onSend={appendUserAndStubAssistant}
        onValueChange={setInputValue}
        value={inputValue}
      >
        <Chat className="h-full">
          <Chat.Header className="border-0" />
          <Chat.Transcript />
          <div className="shrink-0 p-2">
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
          states: {
            characterName: "Preview",
            threadName: "Submitted",
          },
        }}
        messages={{ states: { messages, status: "submitted" } }}
      >
        <Chat.Transcript />
      </Chat.Root>
    </div>
  );
}

export default function ChatPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-2">
      <Preview title="Workspace — single Root, composed regions">
        <ChatWorkspacePreview />
      </Preview>
      <Preview title="Transcript — submitted (loading row)">
        <ChatSubmittedRowPreview />
      </Preview>
    </PreviewWrapper>
  );
}
