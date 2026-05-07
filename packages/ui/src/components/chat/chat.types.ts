import type {
  ChatAddToolApproveResponseFunction,
  ChatStatus,
  UIMessage,
} from "ai";
import type { ReactNode } from "react";

import type {
  GithubDeployerActions,
  GithubDeployerStates,
} from "../github-deployer/github-deployer.types";

export type { UIMessage } from "ai";

/** Pass to `Chat.GithubDeployPopover` (all props explicit; no context). */
export interface ChatGithubDeployPopoverConfig {
  actions?: GithubDeployerActions;
  children?: ReactNode;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  states: GithubDeployerStates;
  triggerClassName?: string;
}

export type ChatGithubDeployPopoverProps = ChatGithubDeployPopoverConfig;

/** One row in the thread history menu (`title` truncates; `updatedAt` stays visible on the right). */
export interface ChatHeaderThreadHistoryItem {
  id: string;
  referential?: boolean;
  title: string;
  updatedAt: string;
}

export interface ChatHeaderThreadHistory {
  activeThreadId: string;
  items: ChatHeaderThreadHistoryItem[];
  onSelect: (threadId: string) => void;
}

export interface ChatMessagesStates {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  messages: UIMessage[];
  status?: ChatStatus;
  transcriptFooter?: ReactNode;
}

export interface ChatTranscriptProps {
  addToolApprovalResponse?: ChatAddToolApproveResponseFunction;
  messages: UIMessage[];
  status?: ChatStatus;
  transcriptFooter?: ReactNode;
}

export interface ChatInputVariant0Props {
  placeholder?: string;
}

/** Optional layout shell; forwards `children` only. */
export interface ChatRootProps {
  children?: ReactNode;
}
