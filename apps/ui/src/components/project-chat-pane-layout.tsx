"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import {
  Chat,
  downloadChatMessagesJson,
} from "@workspace/ui/components/chat/chat";
import type { ChatHeaderThreadHistory } from "@workspace/ui/components/chat/chat.types";
import { cn } from "@workspace/ui/lib/utils";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useAtomValue } from "jotai";
import { useParams, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
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
  AssistantContextPayload,
  AssistantSessionPayload,
  AssistantThreadDTO,
} from "@/lib/chat-persistence/types";
import {
  NAVIGATE_APP_TOOL_NAME,
  type NavigateAppToolOutput,
  runNavigateAppTool,
} from "@/lib/tool/chat-navigate-app-tool";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { CANVAS_SERVICE_QUERY_KEY } from "@/store/canvas-store";
import {
  rightPaneOpenAtom,
  toggleRightPaneVisibility,
} from "@/store/layout-store";

function buildAssistantContextPayload(
  projectUid: string,
  selectedServiceUid: string
): AssistantContextPayload | undefined {
  const pu = projectUid.trim();
  const sw = selectedServiceUid.trim();
  if (pu === "" && sw === "") {
    return undefined;
  }
  return {
    ...(pu === "" ? {} : { projectUid: pu }),
    ...(sw === "" ? {} : { selectedWorkload: { kubernetesUid: sw } }),
  };
}

function ProjectAssistantChatSession({
  bootstrap,
  creatingThread,
  threads,
  assistantNamespaceRaw,
  onAssistantStreamFinished,
  onClosePane,
  onCreateThread,
  onSelectThread,
}: {
  bootstrap: Pick<AssistantSessionPayload, "chatId" | "messages">;
  creatingThread: boolean;
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

  const params = useParams<{ uid?: string }>();
  const projectUid = decodeURIComponent(params.uid ?? "");
  const [serviceUidQuery] = useQueryState(
    CANVAS_SERVICE_QUERY_KEY,
    parseAsString
  );

  // Keep a live ref so the transport memo stays stable across URL changes.
  const wireRef = useRef({
    namespace: assistantNamespaceRaw,
    projectUid,
    selectedServiceUid: serviceUidQuery ?? "",
  });
  wireRef.current = {
    namespace: assistantNamespaceRaw,
    projectUid,
    selectedServiceUid: serviceUidQuery ?? "",
  };

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
          const wire = wireRef.current;
          const assistantContext = buildAssistantContextPayload(
            wire.projectUid,
            wire.selectedServiceUid
          );

          return {
            api,
            credentials,
            headers,
            body: {
              ...(body && typeof body === "object" ? body : {}),
              ...(assistantContext == null ? {} : { assistantContext }),
              chatId: id,
              encodedKubeconfig: encodeURIComponent(kubeconfig),
              message: last,
              namespace: wire.namespace,
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
        updatedAtSource: t.updatedAt,
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

  const composerContextToggles = useMemo(() => {
    const toggles: string[] = [];
    if (projectUid.trim() !== "") {
      toggles.push("Current Project");
    }
    if ((serviceUidQuery ?? "").trim() !== "") {
      toggles.push("Current Service");
    }
    return toggles;
  }, [projectUid, serviceUidQuery]);

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

  const exportTranscript = useCallback(() => {
    downloadChatMessagesJson(messages, { fileNameStem: threadLabel });
  }, [messages, threadLabel]);

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
          <Chat.Export
            disabled={messages.length === 0}
            onExport={exportTranscript}
          />
          <Chat.NewThread
            aria-label="Create thread"
            creating={creatingThread}
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
        <div className="group flex w-full shrink-0 flex-col p-2 pt-4">
          <div className="relative isolate w-full">
            {composerContextToggles.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full -translate-y-full">
                <Chat.ContextIndicator
                  className="w-full"
                  contextToggles={composerContextToggles}
                />
              </div>
            ) : null}
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
  const [creatingThread, setCreatingThread] = useState(false);
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
    setCreatingThread(true);
    try {
      const created = await createAssistantThread(namespaceRaw);
      if (created == null) {
        return;
      }
      setSession({
        chatId: created.chatId,
        messages: [],
        threads: created.threads,
      });
    } finally {
      setCreatingThread(false);
    }
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
      creatingThread={creatingThread}
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
