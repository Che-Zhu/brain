"use client";

import { HighlightedCode } from "@workspace/ui/components/mdx/highlighted-code";
import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";
import type { Components } from "streamdown";

const LANGUAGE_CLASS = /language-(\w+)/;
const TRAILING_NEWLINE = /\n$/;

type FootnoteAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  "data-footnote-ref"?: boolean;
  "data-footnote-backref"?: string | boolean | "";
};

/**
 * Shared markdown element map for MDX, react-markdown, and Streamdown (`MessageResponse`).
 */
export const markdownComponents = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        "mt-2 scroll-m-20 font-bold font-heading text-4xl",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        "mt-12 scroll-m-20 pb-2 font-heading font-semibold text-2xl tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        "mt-8 scroll-m-20 font-heading font-semibold text-xl tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className={cn(
        "mt-8 scroll-m-20 font-heading font-semibold text-lg tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5
      className={cn(
        "mt-8 scroll-m-20 font-semibold text-lg tracking-tight",
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      className={cn(
        "mt-8 scroll-m-20 font-semibold text-base tracking-tight",
        className
      )}
      {...props}
    />
  ),
  a: ({
    className,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const p = props as FootnoteAnchorProps;
    const footnoteRef = p["data-footnote-ref"] === true;
    const footnoteBackref = p["data-footnote-backref"] !== undefined;

    if (footnoteRef) {
      return (
        <a
          className={cn(
            "font-medium text-muted-foreground tabular-nums no-underline hover:text-foreground",
            className
          )}
          {...props}
        />
      );
    }
    if (footnoteBackref) {
      return (
        <a
          className={cn(
            "text-muted-foreground no-underline hover:text-foreground",
            className
          )}
          {...props}
        />
      );
    }
    return (
      <a
        className={cn(
          "font-medium underline underline-offset-4 transition-colors hover:text-muted-foreground",
          className
        )}
        {...props}
      />
    );
  },
  section: ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => {
    const isFootnotes =
      (
        props as React.HTMLAttributes<HTMLElement> & {
          "data-footnotes"?: boolean;
        }
      )["data-footnotes"] === true;
    if (isFootnotes) {
      return (
        <section
          className={cn(
            "mt-10 border-border border-t pt-6 text-muted-foreground text-sm [&_ol]:my-0 [&_ol]:ml-0 [&_ol]:pl-4",
            className
          )}
          {...props}
        >
          {children}
        </section>
      );
    }
    return (
      <section className={className} {...props}>
        {children}
      </section>
    );
  },
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("not-first:mt-6 leading-7", className)} {...props} />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={cn("ml-6 list-disc marker:text-muted-foreground", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className={cn(
        "ml-6 list-decimal marker:text-muted-foreground",
        "[&_ol]:list-[lower-alpha]!",
        "[&_ol_ol]:list-[lower-roman]!",
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <li className={cn("mt-2", className)} {...props} />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    />
  ),
  img: ({
    className,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // biome-ignore lint/correctness/useImageSize: MDX/markdown images have arbitrary dimensions
    <img alt={alt} className={cn("rounded-md", className)} {...props} />
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-4 md:my-8" {...props} />
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className={cn("w-full", className)} {...props} />
    </div>
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className={cn("m-0 border-t p-0 even:bg-muted", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        "border px-4 py-2 text-left font-bold [[align=center]]:text-center [[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn(
        "border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => <>{children}</>,
  code: ({
    children,
    className: codeClassName,
  }: React.HTMLAttributes<HTMLElement>) => {
    const match = LANGUAGE_CLASS.exec(codeClassName || "");
    const language = match ? match[1] : "text";
    const codeString = String(children).replace(TRAILING_NEWLINE, "");
    const isBlock = Boolean(match);

    return (
      <HighlightedCode.Provider
        code={codeString}
        inline={!isBlock}
        language={language}
      >
        {isBlock ? (
          <HighlightedCode.Root className={codeClassName}>
            <HighlightedCode.Header>
              <HighlightedCode.Language />
              <HighlightedCode.CopyButton />
            </HighlightedCode.Header>
            <HighlightedCode.Body />
          </HighlightedCode.Root>
        ) : (
          <HighlightedCode.Inline className={codeClassName} />
        )}
      </HighlightedCode.Provider>
    );
  },
} as Components;

/** Alias for MDX / react-markdown docs that use `components`. */
export const components = markdownComponents;
