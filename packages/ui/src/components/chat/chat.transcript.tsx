"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { type ComponentProps, Fragment } from "react";

import { useChatMessages } from "./chat.context";

const userBubbleClassName =
  "group-[.is-user]:rounded-3xl group-[.is-user]:rounded-br-md group-[.is-user]:border group-[.is-user]:bg-background-selected group-[.is-user]:px-3 group-[.is-user]:py-1.5";

/** Message list + scroll region from the messages slice (compose your own list around `Conversation` if needed). */
export function ChatTranscript({ className, ...props }: ComponentProps<"div">) {
  const {
    states: { messages, status },
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
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: part order is stable per message
                        <Fragment key={`${message.id}-text-${i}`}>
                          <MessageResponse>{part.text}</MessageResponse>
                        </Fragment>
                      );
                    default:
                      return null;
                  }
                })}
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
