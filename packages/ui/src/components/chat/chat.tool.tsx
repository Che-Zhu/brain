"use client";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import type { EmitGenUISpecToolOutput } from "@workspace/ui/lib/gen-ui-tool";
import type { ChatAddToolApproveResponseFunction, UIMessage } from "ai";
import { isToolUIPart } from "ai";

import { ChatGenUIRenderer } from "./chat.gen-ui";

export function ChatTool({
  addToolApprovalResponse,
  part,
  partKeyPrefix,
}: {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  part: UIMessage["parts"][number];
  partKeyPrefix: string;
}) {
  if (!(isToolUIPart(part) && part.type === "tool-emitGenUISpec")) {
    return null;
  }

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return (
        <div
          className="flex items-center gap-2 text-muted-foreground text-xs"
          data-slot="chat-gen-ui-pending"
        >
          <Spinner className="size-4 shrink-0" />
          <span>Preparing UI spec...</span>
        </div>
      );
    case "approval-requested": {
      const specPreview = JSON.stringify(part.input, null, 2);
      return (
        <div
          className="flex max-w-full flex-col gap-2 rounded-lg border border-border bg-background p-3"
          data-slot="chat-gen-ui-approval"
        >
          <p className="text-foreground text-xs">
            Render this generated UI? Review the spec below.
          </p>
          <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs leading-snug">
            {specPreview}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                addToolApprovalResponse?.({
                  approved: true,
                  id: part.approval.id,
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
                  id: part.approval.id,
                  reason: "User declined to render this UI spec.",
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Deny
            </Button>
          </div>
        </div>
      );
    }
    case "approval-responded":
      return (
        <div
          className="flex items-center gap-2 text-muted-foreground text-xs"
          data-slot="chat-gen-ui-approval-sent"
        >
          <Spinner className="size-4 shrink-0" />
          <span>Applying your decision...</span>
        </div>
      );
    case "output-available": {
      const out = part.output as EmitGenUISpecToolOutput;
      if (!out.ok) {
        return (
          <p
            className="rounded-md border border-destructive/35 bg-muted/40 p-2 text-destructive text-xs"
            role="alert"
          >
            {out.validationMessage}
          </p>
        );
      }
      return (
        <ChatGenUIRenderer key={`${partKeyPrefix}-spec`} spec={out.spec} />
      );
    }
    case "output-error":
      return (
        <p
          className="rounded-md border border-destructive/35 bg-muted/40 p-2 text-destructive text-xs"
          role="alert"
        >
          {part.errorText}
        </p>
      );
    case "output-denied":
      return (
        <p
          className="rounded-md border border-border bg-muted/40 p-2 text-muted-foreground text-xs"
          role="status"
        >
          UI render cancelled
          {part.approval.reason ? ` - ${part.approval.reason}` : "."}
        </p>
      );
    default:
      return null;
  }
}
