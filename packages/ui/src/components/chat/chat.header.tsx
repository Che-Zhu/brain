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
import { ChevronDown, PanelRightClose } from "lucide-react";
import { type ComponentProps, useMemo } from "react";

import type { ChatHeaderThreadHistory } from "./chat.types";

const headerControlClass = "hoverable rounded-xl";

export type ChatHeaderExportProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick" | "size" | "type" | "variant"
> & {
  onExport?: () => void;
};

/** Export control; pass `onExport` from the host. */
export function ChatHeaderExport({
  className,
  onExport,
  ...props
}: ChatHeaderExportProps) {
  return (
    <Button
      aria-label="Export"
      className={cn(headerControlClass, className)}
      disabled={onExport === undefined}
      onClick={() => onExport?.()}
      size="icon-lg"
      type="button"
      variant="ghost"
      {...props}
    >
      <HugeiconsIcon icon={FileExportIcon} size={16} strokeWidth={2} />
    </Button>
  );
}

export type ChatHeaderNewThreadProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick" | "size" | "type" | "variant"
> & {
  onNewThread?: () => void;
};

/** New thread control; pass `onNewThread` from the host. */
export function ChatHeaderNewThread({
  className,
  onNewThread,
  ...props
}: ChatHeaderNewThreadProps) {
  return (
    <Button
      aria-label="New thread"
      className={cn(headerControlClass, className)}
      disabled={onNewThread === undefined}
      onClick={() => onNewThread?.()}
      size="icon-lg"
      type="button"
      variant="ghost"
      {...props}
    >
      <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
    </Button>
  );
}

export type ChatHeaderSettingProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick" | "size" | "type" | "variant"
> & {
  onSettings?: () => void;
};

/** Settings control; omitted `onSettings` renders nothing. */
export function ChatHeaderSetting({
  className,
  onSettings,
  ...props
}: ChatHeaderSettingProps) {
  if (!onSettings) {
    return null;
  }

  return (
    <Button
      aria-label="Settings"
      className={cn(headerControlClass, className)}
      onClick={onSettings}
      size="icon-lg"
      type="button"
      variant="ghost"
      {...props}
    >
      <HugeiconsIcon icon={Setting07Icon} size={16} strokeWidth={2} />
    </Button>
  );
}

export type ChatHeaderClosePaneProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick" | "size" | "type" | "variant"
> & {
  onClosePane: () => void;
};

/** Close / collapse pane (e.g. assistant sidebar); host supplies `onClosePane`. */
export function ChatHeaderClosePane({
  className,
  onClosePane,
  "aria-label": ariaLabel = "Close panel",
  ...props
}: ChatHeaderClosePaneProps) {
  return (
    <Button
      aria-label={ariaLabel}
      className={cn(headerControlClass, className)}
      onClick={onClosePane}
      size="icon-lg"
      type="button"
      variant="ghost"
      {...props}
    >
      <PanelRightClose aria-hidden className="size-4" strokeWidth={2} />
    </Button>
  );
}

export type ChatThreadSelectProps = ComponentProps<"div"> & {
  threadHistory?: ChatHeaderThreadHistory;
  threadName: string;
};

/** Thread title; becomes a selector when `threadHistory` is passed. */
export function ChatThreadSelect({
  className,
  threadHistory,
  threadName,
  ...props
}: ChatThreadSelectProps) {
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

export type ChatHeaderProps = ComponentProps<"header"> & {
  threadHistory?: ChatHeaderThreadHistory;
  threadName: string;
};

/** Single-line header: thread title + host-composed controls (`Chat.Export`, `Chat.NewThread`, …). */
export function ChatHeader({
  className,
  children,
  threadHistory,
  threadName,
  ...props
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-1 border-border border-b p-2",
        className
      )}
      data-slot="chat-header"
      {...props}
    >
      <ChatThreadSelect threadHistory={threadHistory} threadName={threadName} />
      <div
        className="flex min-w-0 shrink-0 items-center"
        data-slot="chat-header-actions"
      >
        {children}
      </div>
    </header>
  );
}

ChatThreadSelect.displayName = "Chat.ThreadSelect";
ChatHeaderExport.displayName = "Chat.Export";
ChatHeaderNewThread.displayName = "Chat.NewThread";
ChatHeaderSetting.displayName = "Chat.Setting";
ChatHeaderClosePane.displayName = "Chat.ClosePane";
ChatHeader.displayName = "Chat.Header";
