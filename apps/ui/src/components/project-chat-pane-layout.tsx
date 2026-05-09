"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { Chat } from "@workspace/ui/components/chat/chat";
import type { ChatHeaderThreadHistory } from "@workspace/ui/components/chat/chat.types";
import { cn } from "@workspace/ui/lib/utils";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProjectTranscriptGithubDeployer } from "@/components/project-transcript-github-deployer";
import { useGithubDeployer } from "@/hooks/use-github-deployer";
import {
  createAssistantThread,
  fetchAssistantSession,
  fetchAssistantThreadMessages,
  fetchAssistantThreads,
} from "@/lib/chat-persistence/client";
import type {
  AssistantSessionPayload,
  AssistantThreadDTO,
} from "@/lib/chat-persistence/types";
import {
  NAVIGATE_APP_TOOL_NAME,
  type NavigateAppToolOutput,
  runNavigateAppTool,
} from "@/lib/tool/chat-navigate-app-tool";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import {
  rightPaneOpenAtom,
  toggleRightPaneVisibility,
} from "@/store/layout-store";

function ProjectAssistantChatSession({
  bootstrap,
  threads,
  assistantNamespaceRaw,
  onAssistantStreamFinished,
  onClosePane,
  onCreateThread,
  onSelectThread,
}: {
  bootstrap: Pick<AssistantSessionPayload, "chatId" | "messages">;
  threads: AssistantThreadDTO[];
  assistantNamespaceRaw: string;
  onAssistantStreamFinished?: () => Promise<void>;
  onClosePane: () => void;
  onCreateThread: () => Promise<void>;
  onSelectThread: (threadId: string) => Promise<void>;
}) {
  const router = useRouter();
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const chatId = bootstrap.chatId;
  const addToolOutputRef = useRef<
    | ((args: {
        tool: typeof NAVIGATE_APP_TOOL_NAME;
        toolCallId: string;
        output: NavigateAppToolOutput;
      }) => void | PromiseLike<void>)
    | null
  >(null);

  const nsRef = useRef(assistantNamespaceRaw);
  nsRef.current = assistantNamespaceRaw;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({
          api,
          body,
          credentials,
          headers,
          id,
          messages,
        }) => {
          const last = messages.at(-1);
          if (last == null) {
            throw new Error("Assistant chat: no message to send");
          }
          return {
            api,
            credentials,
            headers,
            body: {
              chatId: id,
              namespace: nsRef.current,
              message: last,
              encodedKubeconfig: encodeURIComponent(kubeconfig),
              ...(body && typeof body === "object" ? body : {}),
            },
          };
        },
      }),
    [kubeconfig]
  );

  const { messages, sendMessage, status, stop, setMessages, addToolOutput } =
    useAIChat({
      id: chatId,
      messages: bootstrap.messages,
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      async onFinish() {
        await onAssistantStreamFinished?.();
      },
      onToolCall({ toolCall }) {
        if (toolCall.toolName !== NAVIGATE_APP_TOOL_NAME) {
          return;
        }
        const result = runNavigateAppTool(toolCall.input, router.push);
        const submit = addToolOutputRef.current;
        if (submit == null) {
          return;
        }
        Promise.resolve(
          submit({
            tool: NAVIGATE_APP_TOOL_NAME,
            toolCallId: toolCall.toolCallId,
            output: result,
          })
        ).catch((err: unknown) => {
          console.error("[navigateApp] addToolOutput failed:", err);
        });
      },
    });

  // console.log("messages", messages);

  addToolOutputRef.current = addToolOutput;
  const [input, setInput] = useState("");
  const {
    authLoading,
    clearTranscriptUi,
    commitDeployToMessages,
    githubToken,
    initiateGithubAuth,
    isAuthorized,
    toggleTranscriptDeployer,
    transcriptDeployerOpen,
  } = useGithubDeployer({ setMessages });

  const createThreadClicked = useCallback(() => {
    clearTranscriptUi();
    onCreateThread().catch(() => undefined);
  }, [clearTranscriptUi, onCreateThread]);

  const threadHistory = useMemo((): ChatHeaderThreadHistory | undefined => {
    if (threads.length === 0) {
      return undefined;
    }
    return {
      activeThreadId: chatId,
      items: threads.map((t) => ({
        id: t.id,
        title: t.title,
        updatedAt: new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(t.updatedAt)),
      })),
      onSelect: (threadId: string) => {
        clearTranscriptUi();
        onSelectThread(threadId).catch(() => undefined);
      },
    };
  }, [threads, chatId, clearTranscriptUi, onSelectThread]);

  const threadLabel = useMemo(() => {
    const hit = threads.find((t) => t.id === chatId);
    return hit?.title ?? "Assistant";
  }, [threads, chatId]);

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
        <Chat.Header
          className="shrink-0"
          threadHistory={threadHistory}
          threadName={threadLabel}
        >
          <Chat.Export onExport={() => undefined} />
          <Chat.NewThread
            aria-label="Create thread"
            onNewThread={createThreadClicked}
          />
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

function ProjectAssistantChatPane({
  onClosePane,
}: {
  onClosePane: () => void;
}) {
  const namespaceRaw = useAtomValue(namespaceAtom);
  const [session, setSession] = useState<AssistantSessionPayload | null>(null);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setSessionError(false);

    fetchAssistantSession(namespaceRaw).then((payload) => {
      if (cancelled) {
        return;
      }
      if (payload == null) {
        setSessionError(true);
        return;
      }
      setSession(payload);
    });

    return () => {
      cancelled = true;
    };
  }, [namespaceRaw]);

  const selectThread = useCallback(
    async (threadId: string) => {
      if (threadId === session?.chatId) {
        return;
      }
      const messages = await fetchAssistantThreadMessages(
        threadId,
        namespaceRaw
      );
      if (messages == null) {
        return;
      }
      setSession((prev) =>
        prev == null ? prev : { ...prev, chatId: threadId, messages }
      );
    },
    [namespaceRaw, session?.chatId]
  );

  const createThread = useCallback(async () => {
    const created = await createAssistantThread(namespaceRaw);
    if (created == null) {
      return;
    }
    setSession({
      chatId: created.chatId,
      messages: [],
      threads: created.threads,
    });
  }, [namespaceRaw]);

  const refreshThreads = useCallback(async () => {
    const threads = await fetchAssistantThreads(namespaceRaw);
    if (threads == null || threads.length === 0) {
      return;
    }
    setSession((prev) => (prev == null ? prev : { ...prev, threads }));
  }, [namespaceRaw]);

  if (sessionError) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 items-center justify-center bg-muted/20 p-4 text-center text-muted-foreground text-sm"
        data-slot="assistant-chat-error"
      >
        Could not load assistant chat. Check DATABASE_URL and database
        migrations, then refresh.
      </div>
    );
  }

  if (session === null) {
    return (
      <div
        aria-busy
        className="h-full min-h-0 flex-1 bg-muted/20"
        data-slot="assistant-chat-boot"
      />
    );
  }

  return (
    <ProjectAssistantChatSession
      assistantNamespaceRaw={namespaceRaw}
      bootstrap={session}
      key={session.chatId}
      onAssistantStreamFinished={refreshThreads}
      onClosePane={onClosePane}
      onCreateThread={createThread}
      onSelectThread={selectThread}
      threads={session.threads}
    />
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
          "box-border flex min-h-0 w-[40%] min-w-[420px] shrink-0 flex-col overflow-hidden border-border border-l bg-background",
          !rightPaneOpen && "hidden"
        )}
        data-slot="project-right-pane"
      >
        <ProjectAssistantChatPane onClosePane={toggleRightPaneVisibility} />
      </aside>
    </div>
  );
}
