"use client";

import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import type { ChatAddToolApproveResponseFunction, UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { Fragment, type ReactNode } from "react";

import { ChatTool } from "./chat.tool";

export function renderChatPart({
  addToolApprovalResponse,
  part,
  partKeyPrefix,
}: {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  part: UIMessage["parts"][number];
  partKeyPrefix: string;
}): ReactNode {
  if (part.type === "text") {
    return (
      <Fragment key={`${partKeyPrefix}-text`}>
        <MessageResponse>{part.text}</MessageResponse>
      </Fragment>
    );
  }

  if (isToolUIPart(part) && part.type === "tool-emitGenUISpec") {
    return (
      <ChatTool
        addToolApprovalResponse={addToolApprovalResponse}
        key={`${partKeyPrefix}-tool`}
        part={part}
        partKeyPrefix={partKeyPrefix}
      />
    );
  }

  return null;
}
