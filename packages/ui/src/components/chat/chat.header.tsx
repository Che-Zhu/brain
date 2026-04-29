"use client";

import {
  Add01Icon,
  FileExportIcon,
  Setting07Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
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
import { HistoryIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo } from "react";

import { useChatHeader } from "./chat.context";

/** Breadcrumb trail from `Chat.Root` header slice. */
export function ChatBreadcrumb({
  className,
  ...props
}: ComponentProps<typeof Breadcrumb>) {
  const {
    states: {
      breadcrumbParentHref,
      breadcrumbParentLabel,
      characterName,
      threadName,
    },
  } = useChatHeader();

  const parentLabel = breadcrumbParentLabel?.trim();
  const showParent = Boolean(parentLabel);
  const characterSegment = characterName?.trim();
  const showCharacter = Boolean(characterSegment);

  return (
    <Breadcrumb
      className={cn("min-w-0 flex-1 overflow-hidden pl-1", className)}
      {...props}
    >
      <BreadcrumbList className="flex-nowrap">
        {showParent ? (
          <>
            <BreadcrumbItem className="min-w-0 shrink">
              {breadcrumbParentHref ? (
                <BreadcrumbLink
                  className="truncate font-medium text-sm"
                  href={breadcrumbParentHref}
                >
                  {parentLabel}
                </BreadcrumbLink>
              ) : (
                <span className="truncate font-medium text-foreground text-sm">
                  {parentLabel}
                </span>
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3.5" />
          </>
        ) : null}
        {showCharacter ? (
          <>
            <BreadcrumbItem className="min-w-0 shrink">
              <span className="truncate font-medium text-foreground text-sm">
                {characterSegment}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3.5" />
          </>
        ) : null}
        <BreadcrumbItem className="min-w-0 shrink">
          <BreadcrumbPage className="truncate text-sm">
            {threadName}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Export / history / new thread / settings from header actions. */
export function ChatHeaderToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  const {
    actions: { onExport, onNewThread, onSettings, threadHistory },
  } = useChatHeader();

  const historyItems = threadHistory?.items ?? [];
  const visibleHistoryItems = useMemo(
    () => historyItems.filter((item) => !item.referential),
    [historyItems]
  );
  const canPickHistory = threadHistory && visibleHistoryItems.length > 0;

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
      {threadHistory ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Thread history"
            className="hoverable flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            data-slot="chat-header-history-trigger"
            disabled={!canPickHistory}
            type="button"
          >
            <HistoryIcon aria-hidden className="size-4" strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-wlg min-w-xs">
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
      ) : null}
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
      <ChatBreadcrumb />
      <div className="flex min-w-0 shrink-0 items-center">
        <ChatHeaderToolbar />
        {trailing}
      </div>
    </header>
  );
}

ChatBreadcrumb.displayName = "Chat.Breadcrumb";
ChatHeaderToolbar.displayName = "Chat.HeaderToolbar";
ChatHeader.displayName = "Chat.Header";
