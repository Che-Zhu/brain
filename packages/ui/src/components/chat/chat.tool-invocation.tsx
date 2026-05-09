"use client";

import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@workspace/ui/components/ai-elements/task";
import { Button } from "@workspace/ui/components/button";
import type { ChatAddToolApproveResponseFunction, UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { type ReactNode, useEffect, useState } from "react";

/** States where the inspector should stay open until the tool settles. */
function toolNeedsExpandedPanel(state: string): boolean {
  return (
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested" ||
    state === "output-error"
  );
}

function toolSettledCollapsed(state: string): boolean {
  return state === "output-available" || state === "output-denied";
}

function humanizeToolType(type: string): string {
  if (type.startsWith("tool-")) {
    return type.slice("tool-".length);
  }
  return type;
}

function toolStateTitle(state: string): string {
  switch (state) {
    case "input-streaming":
      return "Receiving input";
    case "input-available":
      return "Running";
    case "approval-requested":
      return "Needs approval";
    case "approval-responded":
      return "Applying decision";
    case "output-available":
      return "Completed";
    case "output-error":
      return "Error";
    case "output-denied":
      return "Denied";
    default:
      return state;
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function PreBlock({ children }: { children: string }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-md bg-muted/45 p-2 font-mono text-foreground text-xs leading-relaxed">
      {children}
    </pre>
  );
}

type ToolLikePart = UIMessage["parts"][number] & {
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; reason?: string };
};

function ChatToolInvocationContent({
  addToolApprovalResponse,
  part: toolPart,
  partKeyPrefix,
}: {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  part: ToolLikePart;
  partKeyPrefix: string;
}): ReactNode {
  const name = humanizeToolType(toolPart.type);
  const stateLabel = toolStateTitle(toolPart.state);
  const title = `${name} · ${stateLabel}`;

  const [taskOpen, setTaskOpen] = useState(() => {
    if (toolSettledCollapsed(toolPart.state)) {
      return false;
    }
    return toolNeedsExpandedPanel(toolPart.state);
  });

  useEffect(() => {
    if (toolSettledCollapsed(toolPart.state)) {
      setTaskOpen(false);
      return;
    }
    if (toolNeedsExpandedPanel(toolPart.state)) {
      setTaskOpen(true);
    }
  }, [toolPart.state]);

  const pendingApprovalId =
    toolPart.state === "approval-requested" ? toolPart.approval?.id : undefined;

  return (
    <div
      className="w-full min-w-0"
      data-slot="chat-tool-invocation"
      data-tool-part={partKeyPrefix}
    >
      <Task
        onOpenChange={(next) => {
          setTaskOpen(next);
        }}
        open={taskOpen}
      >
        <TaskTrigger title={title} />
        <TaskContent>
          {toolPart.input !== undefined && (
            <TaskItem>
              <p className="mb-1 font-medium text-foreground text-xs">Input</p>
              <PreBlock>{formatJson(toolPart.input)}</PreBlock>
            </TaskItem>
          )}
          {toolPart.state === "output-available" &&
            toolPart.output !== undefined && (
              <TaskItem>
                <p className="mb-1 font-medium text-foreground text-xs">
                  Output
                </p>
                <PreBlock>{formatJson(toolPart.output)}</PreBlock>
              </TaskItem>
            )}
          {toolPart.state === "output-error" &&
            toolPart.errorText != null &&
            toolPart.errorText !== "" && (
              <TaskItem>
                <p className="mb-1 font-medium text-destructive text-xs">
                  Error
                </p>
                <p className="whitespace-pre-wrap rounded-md border border-destructive/35 bg-destructive/10 p-2 text-destructive text-xs">
                  {toolPart.errorText}
                </p>
              </TaskItem>
            )}
          {toolPart.state === "output-error" &&
            (toolPart.errorText == null || toolPart.errorText === "") && (
              <TaskItem>
                <p className="text-destructive text-xs">Unknown error</p>
              </TaskItem>
            )}
          {toolPart.state === "output-denied" && (
            <TaskItem>
              <p className="text-muted-foreground text-xs">
                Tool call was denied
                {toolPart.approval?.reason != null &&
                toolPart.approval.reason !== ""
                  ? `: ${toolPart.approval.reason}`
                  : "."}
              </p>
            </TaskItem>
          )}
          {pendingApprovalId != null && (
            <TaskItem className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  addToolApprovalResponse?.({
                    approved: true,
                    id: pendingApprovalId,
                  })
                }
                size="sm"
                type="button"
              >
                Approve
              </Button>
              <Button
                onClick={() =>
                  addToolApprovalResponse?.({
                    approved: false,
                    id: pendingApprovalId,
                    reason: "User declined.",
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Deny
              </Button>
            </TaskItem>
          )}
        </TaskContent>
      </Task>
    </div>
  );
}

export function ChatToolInvocation({
  addToolApprovalResponse,
  part,
  partKeyPrefix,
}: {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  part: UIMessage["parts"][number];
  partKeyPrefix: string;
}): ReactNode {
  if (!isToolUIPart(part) || part.type === "tool-emitGenUISpec") {
    return null;
  }

  return (
    <ChatToolInvocationContent
      addToolApprovalResponse={addToolApprovalResponse}
      part={part as ToolLikePart}
      partKeyPrefix={partKeyPrefix}
    />
  );
}
