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
import { renderChatPart } from "./chat.part";
import type { ChatTranscriptProps } from "./chat.types";

const userBubbleClassName =
  "group-[.is-user]:rounded-3xl group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:bg-background-selected group-[.is-user]:px-3 group-[.is-user]:py-1.5";

/** Message list + scroll region; pass AI SDK message state from the host. */
export function ChatTranscript({
  addToolApprovalResponse,
  className,
  messages,
  status,
  transcriptFooter,
  ...props
}: ChatTranscriptProps & ComponentProps<"div">) {
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
          {transcriptFooter != null && (
            <div
              className="w-full min-w-0 shrink-0"
              data-slot="chat-transcript-footer"
            >
              {transcriptFooter}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

ChatTranscript.displayName = "Chat.Transcript";
