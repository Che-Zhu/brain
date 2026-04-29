"use client";

import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { FolderOpen, Square } from "lucide-react";
import { type ComponentProps, useEffect } from "react";

import { useChatInput } from "./chat.context";
import type { ChatComposerProps } from "./chat.types";

/** Bordered composer container (inside `Chat.Root`). */
export function ChatComposerShell({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-background-selected bg-background-tertiary p-2 shadow-sm focus-within:border-border",
        className
      )}
      data-slot="chat-composer-shell"
      {...props}
    />
  );
}

export function ChatComposerTextarea({
  className,
  placeholder = "Message…",
  onChange,
  onKeyDown,
  ...rest
}: ComponentProps<typeof Textarea>) {
  const {
    actions: { onPrimaryAction, setValue },
    meta: { textareaRef },
    state: { responding, value },
  } = useChatInput();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const adjustHeight = () => {
      textarea.style.height = "auto";
      const minHeight = 32;
      const maxHeight = 80;
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    };

    requestAnimationFrame(adjustHeight);
    textarea.addEventListener("input", adjustHeight);
    return () => {
      textarea.removeEventListener("input", adjustHeight);
    };
  }, [textareaRef]);

  return (
    <div className="w-full">
      <Textarea
        className={cn(
          "max-h-20 min-h-8 w-full resize-none rounded-xl border-0 bg-transparent! p-2 px-1 text-sm! shadow-none focus-visible:border-0 focus-visible:ring-0",
          className
        )}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e);
        }}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            !responding
          ) {
            e.preventDefault();
            onPrimaryAction();
          }
          onKeyDown?.(e);
        }}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        style={{ minHeight: 32 }}
        value={value}
        {...rest}
      />
    </div>
  );
}

export function ChatComposerFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1 text-sm",
        className
      )}
      {...props}
    />
  );
}

/** Default “Action” menu inside the composer footer. */
export function ChatComposerActionMenu() {
  const {
    actions: { onSecondaryAction },
  } = useChatInput();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="w-auto cursor-pointer rounded-xl p-2"
            type="button"
            variant="ghost"
          />
        }
      >
        <span className="truncate">Action</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={-4}
        className="w-44 rounded-xl"
        sideOffset={8}
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderOpen className="mr-2 size-4" />
            Starters
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 rounded-xl" sideOffset={8}>
            <DropdownMenuItem
              onClick={() =>
                onSecondaryAction?.({ category: "Starters", item: "Option A" })
              }
            >
              Option A
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onSecondaryAction?.({ category: "Starters", item: "Option B" })
              }
            >
              Option B
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatComposerSend({ className }: { className?: string }) {
  const {
    actions: { onPrimaryAction },
    state: { responding, value },
  } = useChatInput();

  const sendDisabled = !(responding || value.trim());

  return (
    <Button
      className={cn(
        "rounded-xl border transition-all duration-100",
        sendDisabled
          ? "cursor-not-allowed bg-transparent text-foreground hover:bg-transparent"
          : "cursor-pointer border-border bg-background-selected text-foreground hover:bg-background-selected hover:brightness-120",
        className
      )}
      disabled={sendDisabled}
      onClick={onPrimaryAction}
      size="icon"
      type="button"
    >
      {responding ? (
        <Square className="size-4" />
      ) : (
        <HugeiconsIcon icon={ArrowUp02Icon} size={16} strokeWidth={2} />
      )}
    </Button>
  );
}

/** Shell + textarea + footer row (default composer). */
export function ChatComposer({
  className,
  placeholder = "Message…",
  ...props
}: ChatComposerProps) {
  return (
    <ChatComposerShell className={className} {...props}>
      <ChatComposerTextarea placeholder={placeholder} />
      <ChatComposerFooter>
        <ChatComposerActionMenu />
        <ChatComposerSend />
      </ChatComposerFooter>
    </ChatComposerShell>
  );
}

ChatComposerShell.displayName = "Chat.ComposerShell";
ChatComposerTextarea.displayName = "Chat.ComposerTextarea";
ChatComposerFooter.displayName = "Chat.ComposerFooter";
ChatComposerActionMenu.displayName = "Chat.ComposerActionMenu";
ChatComposerSend.displayName = "Chat.ComposerSend";
ChatComposer.displayName = "Chat.Composer";
