import type { ChatStatus, UIMessage } from "ai";
import type { ComponentProps, ReactNode, RefObject } from "react";

export type { UIMessage } from "ai";

export interface ChatHeaderStates {
  /** Optional first crumb (e.g. `Characters`) before `characterName`. */
  breadcrumbParentHref?: string;
  breadcrumbParentLabel?: string;
  /** Segment after optional parent (e.g. character name). Omit for title-only breadcrumb. */
  characterName?: string;
  /** Last segment (e.g. thread title or `Chat`). */
  threadName: string;
}

/** One row in the thread history menu (`title` truncates; `updatedAt` stays visible on the right). */
export interface ChatHeaderThreadHistoryItem {
  id: string;
  referential?: boolean;
  title: string;
  updatedAt: string;
}

/** Picker to switch the active `threads` row (character chat). */
export interface ChatHeaderThreadHistory {
  activeThreadId: string;
  /**
   * When `referential` is true, the row is omitted from the history menu (e.g. curated tone examples in DB).
   */
  items: ChatHeaderThreadHistoryItem[];
  onSelect: (threadId: string) => void;
}

export interface ChatHeaderActions {
  onExport?: () => void;
  /** Start a new thread (e.g. new Instant `threads` row). Omit to disable the control. */
  onNewThread?: () => void;
  onSettings?: () => void;
  /**
   * Open a menu to pick another thread for this character. Omit to hide the control.
   * Typically disabled when `items.length` is 0.
   */
  threadHistory?: ChatHeaderThreadHistory;
}

export interface ChatHeaderValue {
  actions: ChatHeaderActions;
  states: ChatHeaderStates;
}

export interface ChatInputState {
  responding: boolean;
  value: string;
}

export interface ChatInputActions {
  onPrimaryAction: () => void;
  onSecondaryAction?: (detail: { category: string; item: string }) => void;
  setValue: (value: string) => void;
}

export interface ChatInputMeta {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export interface ChatInputCallbacks {
  /** When the assistant is streaming; drives stop control. Overrides internal state when set. */
  isStreaming?: boolean;
  onSecondaryAction?: (detail: { category: string; item: string }) => void;
  onSend?: (message: string) => void;
  onStop?: () => void;
  onValueChange?: (value: string) => void;
  /** Controlled input value; pair with `onValueChange`. */
  value?: string;
}

export interface ChatInputContextValue extends ChatInputCallbacks {
  actions: ChatInputActions;
  meta: ChatInputMeta;
  state: ChatInputState;
}

export interface ChatMessagesStates {
  /** AI SDK UI messages (newest last). Only `text` parts are rendered. */
  messages: UIMessage[];
  /** `useChat` / `AbstractChat` status; when `"submitted"`, shows a loading row before tokens arrive. */
  status?: ChatStatus;
}

/** Reserved for future handlers (retry, branch, etc.). */
export type ChatMessagesActions = Record<string, never>;

export interface ChatMessagesValue {
  actions: ChatMessagesActions;
  states: ChatMessagesStates;
}

/** Full chat context: header, transcript, and composer slices share one `Chat.Root`. */
export interface ChatValue {
  header: ChatHeaderValue;
  input: ChatInputContextValue;
  messages: ChatMessagesValue;
}

export type ChatInputVariant0Props = ComponentProps<"div"> & {
  placeholder?: string;
};

export type ChatComposerProps = ChatInputVariant0Props;

/** Props for `Chat.Root` — supplies all slices; compose with `Chat.Header`, `Chat.Transcript`, `Chat.Composer`, etc. */
export interface ChatRootProps extends ChatInputCallbacks {
  children: ReactNode;
  header: {
    actions?: ChatHeaderActions;
    states: ChatHeaderStates;
  };
  messages: {
    actions?: ChatMessagesActions;
    states: ChatMessagesStates;
  };
}
