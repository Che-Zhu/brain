"use client";

import {
  Add01Icon,
  FileExportIcon,
  Setting07Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo } from "react";

import { useChatHeader } from "./chat.context";

/** Thread title; becomes a selector when `actions.threadHistory` is provided. */
export function ChatThreadSelect({
  className,
  ...props
}: ComponentProps<"div">) {
  const {
    actions: { threadHistory },
    states: { threadName },
  } = useChatHeader();

  const historyItems = threadHistory?.items ?? [];
  const visibleHistoryItems = useMemo(
    () => historyItems.filter((item) => !item.referential),
    [historyItems]
  );
  const canPickHistory = threadHistory && visibleHistoryItems.length > 0;

  if (!threadHistory) {
    return (
      <div
        className={cn(
          "min-w-0 flex-1 truncate pl-1 font-medium text-foreground text-sm",
          className
        )}
        data-slot="chat-thread-title"
        {...props}
      >
        {threadName}
      </div>
    );
  }

  return (
    <div
      className={cn("min-w-0 flex-1 overflow-hidden pl-1", className)}
      data-slot="chat-thread-select"
      {...props}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Select thread"
          className="hoverable flex max-w-full cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 font-medium text-foreground text-sm outline-none disabled:pointer-events-none disabled:cursor-default disabled:opacity-100"
          disabled={!canPickHistory}
          type="button"
        >
          <span className="min-w-0 truncate">{threadName}</span>
          {canPickHistory ? (
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
            />
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-wlg min-w-xs">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Threads</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canPickHistory ? (
              <DropdownMenuRadioGroup
                defaultValue={threadHistory.activeThreadId}
                key={threadHistory.activeThreadId}
                onValueChange={(v) => {
                  if (v) {
                    threadHistory.onSelect(v);
                  }
                }}
              >
                {visibleHistoryItems.map((item) => (
                  <DropdownMenuRadioItem
                    className="min-w-0 text-xs/relaxed"
                    closeOnClick
                    key={item.id}
                    value={item.id}
                  >
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-1">
                      <span
                        className="min-w-0 shrink truncate"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {item.updatedAt}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Export / new thread / settings from header actions. */
export function ChatHeaderToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  const {
    actions: { onExport, onNewThread, onSettings },
  } = useChatHeader();

  return (
    <div
      className={cn("flex shrink-0 items-center", className)}
      data-slot="chat-header-toolbar"
      {...props}
    >
      <Button
        aria-label="Export"
        className="hoverable rounded-xl"
        onClick={onExport}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon icon={FileExportIcon} size={16} strokeWidth={2} />
      </Button>
      <Button
        aria-label="New thread"
        className="hoverable rounded-xl"
        disabled={onNewThread === undefined}
        onClick={() => {
          onNewThread?.();
        }}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
      </Button>
      {onSettings ? (
        <Button
          aria-label="Settings"
          className="hoverable rounded-xl"
          onClick={onSettings}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon icon={Setting07Icon} size={16} strokeWidth={2} />
        </Button>
      ) : null}
    </div>
  );
}

/** Single-line header: breadcrumb + toolbar (compose or replace with your own row). */
export function ChatHeader({
  className,
  trailing,
  ...props
}: ComponentProps<"header"> & { trailing?: ReactNode }) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-1 border-border border-b p-2",
        className
      )}
      data-slot="chat-header"
      {...props}
    >
      <ChatThreadSelect />
      <div className="flex min-w-0 shrink-0 items-center">
        <ChatHeaderToolbar />
        {trailing}
      </div>
    </header>
  );
}

ChatThreadSelect.displayName = "Chat.ThreadSelect";
ChatHeaderToolbar.displayName = "Chat.HeaderToolbar";
ChatHeader.displayName = "Chat.Header";
