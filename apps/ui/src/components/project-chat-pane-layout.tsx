"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { Button } from "@workspace/ui/components/button";
import { Chat } from "@workspace/ui/components/chat/chat";
import { cn } from "@workspace/ui/lib/utils";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { useAtomValue } from "jotai";
import { PanelRightClose } from "lucide-react";
import type { ReactNode } from "react";
import {
  rightPaneOpenAtom,
  toggleRightPaneVisibility,
} from "@/store/layout-store";

function ProjectAssistantChatPane({
  onClosePane,
}: {
  onClosePane: () => void;
}) {
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    addToolApprovalResponse,
  } = useAIChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const busy = status === "submitted" || status === "streaming";

  return (
    <Chat.Root
      header={{
        actions: {
          onExport: () => undefined,
          onNewThread: () => setMessages([]),
        },
        states: {
          threadName: "Assistant",
        },
      }}
      isStreaming={busy}
      messages={{
        states: {
          addToolApprovalResponse,
          messages,
          status,
        },
      }}
      onSend={async (text) => {
        await sendMessage({ text });
      }}
      onStop={stop}
    >
      <Chat className="h-full min-h-0 flex-1 border-0 shadow-none">
        <Chat.Header
          className="shrink-0"
          trailing={
            <Button
              aria-label="Close panel"
              className="hoverable rounded-xl"
              onClick={onClosePane}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <PanelRightClose aria-hidden className="size-4" strokeWidth={2} />
            </Button>
          }
        />
        <Chat.Transcript className="min-h-0 flex-1" />
        <div className="shrink-0 border-border p-2">
          <Chat.Composer placeholder="Message…" />
        </div>
      </Chat>
    </Chat.Root>
  );
}

/** Main project column + optional right assistant chat pane (uses `POST /api/chat` + AI SDK `useChat`). */
export default function ProjectChatPaneLayout({
  children,
}: {
  children: ReactNode;
}) {
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
      {children}
      <aside
        aria-hidden={!rightPaneOpen}
        className={cn(
          "box-border flex min-h-0 w-[35%] min-w-0 shrink-0 flex-col overflow-hidden border-border border-l bg-background",
          !rightPaneOpen && "hidden"
        )}
        data-slot="project-right-pane"
      >
        <ProjectAssistantChatPane onClosePane={toggleRightPaneVisibility} />
      </aside>
    </div>
  );
}
