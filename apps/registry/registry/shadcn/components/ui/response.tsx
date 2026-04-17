"use client";

import { HighlightedCode } from "@registry/shadcn/components/highlighted-code";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

const LANGUAGE_CLASS = /language-(\w+)/;
const TRAILING_NEWLINE = /\n$/;

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = ({ className, ...props }: ResponseProps) => (
  <Streamdown
    className={cn(
      "w-full max-w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      className
    )}
    components={{
      p: ({ children }) => (
        <p className="wrap-break-word text-sm leading-relaxed">{children}</p>
      ),
      pre: ({ children }) => <>{children}</>,
      code: ({ children, className: codeClassName }) => {
        const match = LANGUAGE_CLASS.exec(codeClassName || "");
        const language = match ? match[1] : "text";
        const codeString = String(children).replace(TRAILING_NEWLINE, "");
        const isBlock = Boolean(match);

        return (
          <HighlightedCode
            code={codeString}
            inline={!isBlock}
            language={language}
          />
        );
      },
      ul: ({ className: ulClassName, ...ulProps }) => (
        <ul
          className={cn("max-w-full list-disc pl-6", ulClassName)}
          {...ulProps}
        />
      ),
      blockquote: ({ className: bqClassName, ...bqProps }) => (
        <blockquote
          className={cn(
            "wrap-break-word max-w-full border-l-4 pl-2",
            bqClassName
          )}
          {...bqProps}
        />
      ),
      ol: ({ className: olClassName, ...olProps }) => (
        <ol
          className={cn("max-w-full list-decimal pl-6", olClassName)}
          {...olProps}
        />
      ),
    }}
    mode="static"
    {...props}
  />
);

Response.displayName = "Response";
