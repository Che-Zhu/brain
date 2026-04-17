"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@shadcn/ui/avatar";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: "human" | "ai";
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full min-w-0 items-center gap-2 px-2",
      from === "human"
        ? "is-user flex-row-reverse items-end"
        : "is-assistant items-start",
      className
    )}
    {...props}
  />
);

const messageContentVariants = cva(
  "flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
  {
    variants: {
      variant: {
        contained: [
          "max-w-[95%] px-4 py-2",
          "rounded-2xl rounded-br-md border border-border/50",
          "bg-card text-foreground",
        ],
        flat: "w-full text-foreground",
      },
    },
    defaultVariants: {
      variant: "contained",
    },
  }
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof messageContentVariants>;

export const MessageContent = ({
  children,
  className,
  variant,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(messageContentVariants({ variant, className }))}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar className={cn("size-8 ring-1 ring-border", className)} {...props}>
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || "ME"}</AvatarFallback>
  </Avatar>
);
