"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { Chat } from "@workspace/ui/components/chat/chat";
import { cn } from "@workspace/ui/lib/utils";
import { useAtomValue } from "jotai";
import { type ReactNode, useCallback, useState } from "react";
import { ProjectTranscriptGithubDeployer } from "@/components/project-transcript-github-deployer";
import { useGithubDeployer } from "@/hooks/use-github-deployer";
import {
  rightPaneOpenAtom,
  toggleRightPaneVisibility,
} from "@/store/layout-store";

function ProjectAssistantChatPane({
  onClosePane,
}: {
  onClosePane: () => void;
}) {
  const { messages, sendMessage, status, stop, setMessages } = useAIChat();
  const [input, setInput] = useState("");
  const {
    authLoading,
    commitDeployToMessages,
    githubToken,
    initiateGithubAuth,
    isAuthorized,
    resetChatThread,
    toggleTranscriptDeployer,
    transcriptDeployerOpen,
  } = useGithubDeployer({ setMessages });

  const busy = status === "submitted" || status === "streaming";

  const onPrimaryAction = useCallback(() => {
    if (busy) {
      stop();
      return;
    }
    const text = input.trim();
    if (!text) {
      return;
    }
    sendMessage({ text }).catch(() => undefined);
    setInput("");
  }, [busy, input, sendMessage, stop]);

  const transcriptFooter = transcriptDeployerOpen ? (
    <ProjectTranscriptGithubDeployer
      authLoading={authLoading}
      githubToken={githubToken}
      onAuthorize={initiateGithubAuth}
      onDeployed={commitDeployToMessages}
    />
  ) : null;

  return (
    <Chat.Root>
      <Chat className="h-full min-h-0 flex-1 border-0 shadow-none">
        <Chat.Header className="shrink-0" threadName="Assistant">
          <Chat.Export onExport={() => undefined} />
          <Chat.NewThread onNewThread={resetChatThread} />
          <Chat.ClosePane onClosePane={onClosePane} />
        </Chat.Header>
        <Chat.Transcript
          className="min-h-0 flex-1"
          messages={messages}
          status={status}
          transcriptFooter={transcriptFooter}
        />
        <div className="shrink-0 border-border p-2">
          <Chat.ComposerShell>
            <Chat.ComposerTextarea
              onPrimaryAction={onPrimaryAction}
              onValueChange={setInput}
              placeholder="Message…"
              responding={busy}
              value={input}
            />
            <Chat.ComposerFooter>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Chat.GithubDeployButton
                  authLoading={authLoading}
                  isAuthorized={isAuthorized}
                  onComposerAction={toggleTranscriptDeployer}
                />
              </div>
              <Chat.ComposerSend
                onPrimaryAction={onPrimaryAction}
                responding={busy}
                value={input}
              />
            </Chat.ComposerFooter>
          </Chat.ComposerShell>
        </div>
      </Chat>
    </Chat.Root>
  );
}

/** Main project column + optional right assistant chat pane (`POST /api/chat` + AI SDK). */
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
