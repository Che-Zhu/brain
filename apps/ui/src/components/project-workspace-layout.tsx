"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { Button } from "@workspace/ui/components/button";
import {
  Chat,
  downloadChatMessagesJson,
} from "@workspace/ui/components/chat/chat";
import type { ChatHeaderThreadHistory } from "@workspace/ui/components/chat/chat.types";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
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
import { useSWRConfig } from "swr";
import { useCurrentProjectDisplayName } from "@/hooks/use-current-project-display-name";
import { useGithubAuth } from "@/hooks/use-github-auth";
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
  ProjectSidePaneProvider,
  useProjectSidePaneController,
} from "@/lib/project-side-pane/react";
import {
  NAVIGATE_APP_TOOL_NAME,
  type NavigateAppToolOutput,
  runNavigateAppTool,
} from "@/lib/tool/chat-navigate-app-tool";
import {
  REFRESH_FRONTEND_SWR_TOOL_NAME,
  type RefreshFrontendSwrCachesToolOutput,
  runRefreshFrontendSwrCachesTool,
} from "@/lib/tool/chat-refresh-frontend-swr-tool";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";
import { CANVAS_SERVICE_QUERY_KEY } from "@/store/canvas-store";
import { assistantPaneOpenAtom } from "@/store/layout-store";

type AssistantClientToolSubmission =
  | {
      tool: typeof NAVIGATE_APP_TOOL_NAME;
      toolCallId: string;
      output: NavigateAppToolOutput;
    }
  | {
      tool: typeof REFRESH_FRONTEND_SWR_TOOL_NAME;
      toolCallId: string;
      output: RefreshFrontendSwrCachesToolOutput;
    };

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
  onCreateThread,
  onGithubIntent,
  onSelectThread,
}: {
  bootstrap: Pick<AssistantSessionPayload, "chatId" | "messages">;
  creatingThread: boolean;
  threads: AssistantThreadDTO[];
  assistantNamespaceRaw: string;
  onAssistantStreamFinished?: () => Promise<void>;
  onCreateThread: () => Promise<void>;
  onGithubIntent: () => void;
  onSelectThread: (threadId: string) => Promise<void>;
}) {
  const router = useRouter();
  const { mutate: revalidateScopeSwr } = useSWRConfig();
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const chatId = bootstrap.chatId;
  const addToolOutputRef = useRef<
    ((args: AssistantClientToolSubmission) => void | PromiseLike<void>) | null
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

  const { messages, sendMessage, status, stop, addToolOutput } = useAIChat({
    id: chatId,
    messages: bootstrap.messages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onFinish() {
      await onAssistantStreamFinished?.();
    },
    onToolCall({ toolCall }) {
      if (toolCall.toolName === NAVIGATE_APP_TOOL_NAME) {
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
        return;
      }

      if (toolCall.toolName !== REFRESH_FRONTEND_SWR_TOOL_NAME) {
        return;
      }
      const submitRefresh = addToolOutputRef.current;
      runRefreshFrontendSwrCachesTool(revalidateScopeSwr, toolCall.input)
        .then((output) => {
          if (submitRefresh == null) {
            return;
          }
          Promise.resolve(
            submitRefresh({
              tool: REFRESH_FRONTEND_SWR_TOOL_NAME,
              toolCallId: toolCall.toolCallId,
              output,
            })
          ).catch((err: unknown) => {
            console.error(
              "[refreshFrontendSwrCaches] addToolOutput failed:",
              err
            );
          });
        })
        .catch((err: unknown) => {
          console.error("[refreshFrontendSwrCaches] mutation failed:", err);
        });
    },
  });

  // console.log("messages", messages);

  addToolOutputRef.current = addToolOutput;
  const [input, setInput] = useState("");
  const { isAuthorized, isLoading: authLoading } = useGithubAuth();

  const createThreadClicked = useCallback(() => {
    onCreateThread().catch(() => undefined);
  }, [onCreateThread]);

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
        onSelectThread(threadId).catch(() => undefined);
      },
    };
  }, [threads, chatId, onSelectThread]);

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

  return (
    <Chat.Root>
      <Chat className="h-full min-h-0 flex-1 border-0 bg-[#101219] shadow-none">
        <Chat.Header
          className="shrink-0 py-2 pr-12"
          threadHistory={threadHistory}
          threadName={threadLabel}
        >
          <Chat.Export
            className="size-9"
            disabled={messages.length === 0}
            onExport={exportTranscript}
          />
          <Chat.NewThread
            aria-label="Create thread"
            className="size-9"
            creating={creatingThread}
            onNewThread={createThreadClicked}
          />
        </Chat.Header>
        <Chat.Transcript
          className="min-h-0 flex-1"
          messages={messages}
          status={status}
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
                    onComposerAction={onGithubIntent}
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

function ProjectAssistantChatPane() {
  const namespaceRaw = useAtomValue(namespaceAtom);
  const sidePaneController = useProjectSidePaneController();
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

  const openGithubIntent = useCallback(() => {
    sidePaneController
      .openAssistantIntent({ type: "github" })
      .catch(() => undefined);
  }, [sidePaneController]);

  if (sessionError) {
    return (
      <div
        className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#101219] p-4 text-center text-muted-foreground text-sm"
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
        className="h-full min-h-0 flex-1 bg-[#101219]"
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
      onCreateThread={createThread}
      onGithubIntent={openGithubIntent}
      onSelectThread={selectThread}
      threads={session.threads}
    />
  );
}

function ProjectRouteTopBar({
  assistantPaneOpen,
}: {
  assistantPaneOpen: boolean;
}) {
  const params = useParams<{ uid?: string }>();
  const projectUid = decodeURIComponent(params.uid ?? "");
  const kubeconfig = useAtomValue(kubeconfigAtom);
  const namespace = useAtomValue(namespaceAtom);
  const currentProject = useCurrentProjectDisplayName({
    kubeconfig,
    namespace,
    projectUid,
  });
  const showProjectName = projectUid.trim() !== "";

  return (
    <header
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-13 items-center gap-2 bg-transparent pr-2 pl-6",
        !assistantPaneOpen && "pr-12"
      )}
    >
      <div className="min-w-0 flex-1">
        {showProjectName && currentProject.isLoading ? (
          <Skeleton className="h-5 w-36 max-w-full" />
        ) : null}
        {showProjectName && !currentProject.isLoading ? (
          <h1 className="truncate font-medium text-foreground text-sm">
            {currentProject.displayName ?? "Project"}
          </h1>
        ) : null}
      </div>
    </header>
  );
}

/** Main project column + optional Project Assistant Pane (`POST /api/chat` + AI SDK). */
function ProjectWorkspaceLayoutContent({ children }: { children: ReactNode }) {
  const assistantPaneOpen = useAtomValue(assistantPaneOpenAtom);
  const setAssistantPaneOpen = useSetAtom(assistantPaneOpenAtom);
  const toggleAssistantPane = useCallback(() => {
    setAssistantPaneOpen((open) => !open);
  }, [setAssistantPaneOpen]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
      <section
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        data-slot="project-main-pane"
      >
        <ProjectRouteTopBar assistantPaneOpen={assistantPaneOpen} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </section>
      <aside
        aria-hidden={!assistantPaneOpen}
        className={cn(
          "box-border flex min-h-0 shrink-0 flex-col overflow-hidden border-l bg-[#101219] transition-[width,min-width,opacity,transform,border-color] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none",
          assistantPaneOpen
            ? "w-104 min-w-104 translate-x-0 border-border opacity-100"
            : "pointer-events-none w-0 min-w-0 translate-x-4 border-transparent opacity-0"
        )}
        data-slot="project-assistant-pane"
        id="project-assistant-pane"
      >
        <ProjectAssistantChatPane />
      </aside>
      <Button
        aria-controls="project-assistant-pane"
        aria-expanded={assistantPaneOpen}
        aria-label={
          assistantPaneOpen ? "Close assistant panel" : "Open assistant panel"
        }
        className="hoverable aria-expanded:!bg-transparent absolute top-2 right-2 z-20 size-9 rounded-xl"
        onClick={toggleAssistantPane}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        {assistantPaneOpen ? (
          <PanelRightClose aria-hidden className="size-4" strokeWidth={2} />
        ) : (
          <PanelRightOpen aria-hidden className="size-4" strokeWidth={2} />
        )}
      </Button>
    </div>
  );
}

export default function ProjectWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProjectSidePaneProvider>
      <ProjectWorkspaceLayoutContent>{children}</ProjectWorkspaceLayoutContent>
    </ProjectSidePaneProvider>
  );
}
