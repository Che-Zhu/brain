"use client";

import { Button } from "@workspace/ui/components/button";
import { Chat, type UIMessage } from "@workspace/ui/components/chat/chat";
import { useAtomValue } from "jotai";
import { PanelRightClose } from "lucide-react";
import type { ReactNode } from "react";
import {
  rightPaneOpenAtom,
  toggleRightPaneVisibility,
} from "@/store/layout-store";

const MOCK_CHAT_MESSAGES: UIMessage[] = [
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
];

function ProjectRightPaneChat({ onClosePane }: { onClosePane: () => void }) {
  return (
    <Chat.Root
      header={{
        actions: {
          onExport: () => undefined,
          onNewThread: () => undefined,
        },
        states: {
          threadName: "Assistant",
        },
      }}
      messages={{
        states: { messages: MOCK_CHAT_MESSAGES, status: undefined },
      }}
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

export default function ProjectLayoutShell({
  children,
}: {
  children: ReactNode;
}) {
  const rightPaneOpen = useAtomValue(rightPaneOpenAtom);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
      {children}
      {rightPaneOpen ? (
        <aside
          className="box-border flex min-h-0 w-[35%] min-w-0 shrink-0 flex-col overflow-hidden border-border border-l bg-background"
          data-slot="project-right-pane"
        >
          <ProjectRightPaneChat onClosePane={toggleRightPaneVisibility} />
        </aside>
      ) : null}
    </div>
  );
}
