"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@workspace/ui/components/ai-elements/message";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps } from "react";

import { useChatMessages } from "./chat.context";
import { renderChatPart } from "./chat.part";

const userBubbleClassName =
  "group-[.is-user]:rounded-3xl group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:bg-background-selected group-[.is-user]:px-3 group-[.is-user]:py-1.5";

/** Message list + scroll region from the messages slice (compose your own list around `Conversation` if needed). */
export function ChatTranscript({ className, ...props }: ComponentProps<"div">) {
  const {
    states: { messages, status, addToolApprovalResponse },
  } = useChatMessages();

  return (
    <div
      className={cn("flex min-h-0 w-full flex-1 flex-col", className)}
      data-slot="chat-transcript"
      {...props}
    >
      <Conversation className="min-h-0 w-full flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent className={userBubbleClassName}>
                {message.parts.map((part, i) =>
                  renderChatPart({
                    addToolApprovalResponse,
                    part,
                    partKeyPrefix: `${message.id}-p-${i}`,
                  })
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <div
                  className="flex items-center gap-2 text-muted-foreground"
                  data-slot="chat-transcript-loading"
                >
                  <Spinner className="size-4 shrink-0" />
                  <Shimmer as="span" className="text-sm">
                    Waiting for the model to start…
                  </Shimmer>
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

ChatTranscript.displayName = "Chat.Transcript";
