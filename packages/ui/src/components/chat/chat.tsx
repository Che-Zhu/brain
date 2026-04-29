"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";
import {
  ChatContext,
  ChatRoot,
  useChat,
  useChatHeader,
  useChatInput,
  useChatMessages,
} from "./chat.context";
import { ChatHeader, ChatHeaderToolbar, ChatThreadSelect } from "./chat.header";
import {
  ChatComposer,
  ChatComposerActionMenu,
  ChatComposerFooter,
  ChatComposerSend,
  ChatComposerShell,
  ChatComposerTextarea,
} from "./chat.input";
import { ChatTranscript } from "./chat.transcript";

// biome-ignore lint/performance/noBarrelFile: compound API re-exports
export {
  ChatContext,
  ChatRoot,
  useChat,
  useChatHeader,
  useChatInput,
  useChatMessages,
} from "./chat.context";

export type {
  ChatComposerProps,
  ChatHeaderActions,
  ChatHeaderStates,
  ChatHeaderThreadHistory,
  ChatHeaderThreadHistoryItem,
  ChatHeaderValue,
  ChatInputActions,
  ChatInputCallbacks,
  ChatInputContextValue,
  ChatInputMeta,
  ChatInputState,
  ChatInputVariant0Props,
  ChatMessagesActions,
  ChatMessagesStates,
  ChatMessagesValue,
  ChatRootProps,
  ChatValue,
  UIMessage,
} from "./chat.types";

function ChatShell({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col bg-background",
        className
      )}
      data-slot="chat"
      {...props}
    >
      {children}
    </div>
  );
}

export const Chat = Object.assign(ChatShell, {
  Composer: ChatComposer,
  ComposerActionMenu: ChatComposerActionMenu,
  ComposerFooter: ChatComposerFooter,
  ComposerSend: ChatComposerSend,
  ComposerShell: ChatComposerShell,
  ComposerTextarea: ChatComposerTextarea,
  Context: ChatContext,
  Header: ChatHeader,
  HeaderToolbar: ChatHeaderToolbar,
  Root: ChatRoot,
  ThreadSelect: ChatThreadSelect,
  Transcript: ChatTranscript,
  useChat,
  useChatHeader,
  useChatInput,
  useChatMessages,
});

ChatShell.displayName = "Chat";
