"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChatHeaderValue,
  ChatInputContextValue,
  ChatMessagesValue,
  ChatRootProps,
  ChatValue,
} from "./chat.types";

export const ChatContext = createContext<ChatValue | null>(null);

export function useChat(): ChatValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("Chat: useChat must be used within Chat.Root");
  }
  return ctx;
}

export function useChatHeader(): ChatHeaderValue {
  return useChat().header;
}

export function useChatMessages(): ChatMessagesValue {
  return useChat().messages;
}

export function useChatInput(): ChatInputContextValue {
  return useChat().input;
}

export function ChatRoot({
  children,
  header: headerProp,
  messages: messagesProp,
  isStreaming: isStreamingProp,
  onSecondaryAction,
  onSend,
  onStop,
  onValueChange,
  value: valueProp,
}: ChatRootProps) {
  const header = useMemo(
    (): ChatHeaderValue => ({
      actions: headerProp.actions ?? {},
      states: headerProp.states,
    }),
    [headerProp.actions, headerProp.states]
  );

  const messages = useMemo(
    (): ChatMessagesValue => ({
      actions: messagesProp.actions ?? {},
      states: messagesProp.states,
    }),
    [messagesProp.actions, messagesProp.states]
  );

  const [internalValue, setInternalValue] = useState("");
  const [responding, setResponding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;

  const setValue = useCallback(
    (v: string) => {
      if (isControlled) {
        onValueChange?.(v);
      } else {
        setInternalValue(v);
      }
    },
    [isControlled, onValueChange]
  );

  useEffect(() => {
    if (isControlled && valueProp === "") {
      setResponding(false);
    }
  }, [isControlled, valueProp]);

  const effectiveResponding =
    isStreamingProp === undefined ? responding : isStreamingProp;

  const onPrimaryAction = useCallback(() => {
    if (effectiveResponding) {
      onStop?.();
      if (isStreamingProp === undefined) {
        setResponding(false);
      }
      return;
    }
    if (!value.trim()) {
      return;
    }
    onSend?.(value);
    setValue("");
    if (isStreamingProp === undefined) {
      setResponding(true);
    }
  }, [effectiveResponding, isStreamingProp, onSend, onStop, setValue, value]);

  const input = useMemo(
    (): ChatInputContextValue => ({
      actions: {
        onPrimaryAction,
        onSecondaryAction,
        setValue,
      },
      isStreaming: isStreamingProp,
      meta: { textareaRef },
      onSecondaryAction,
      onSend,
      onStop,
      onValueChange,
      state: { responding: effectiveResponding, value },
      value: valueProp,
    }),
    [
      effectiveResponding,
      isStreamingProp,
      onPrimaryAction,
      onSecondaryAction,
      onSend,
      onStop,
      onValueChange,
      setValue,
      value,
      valueProp,
    ]
  );

  const chatValue = useMemo(
    (): ChatValue => ({ header, input, messages }),
    [header, input, messages]
  );

  return (
    <ChatContext.Provider value={chatValue}>{children}</ChatContext.Provider>
  );
}

ChatRoot.displayName = "Chat.Root";
