"use client";

import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";

const SAMPLE_MARKDOWN = `
# Markdown via MessageResponse

Typography and **Streamdown** with shared \`markdownComponents\`: lists, links, tables, and code.

## Section

- Bullet one
- Bullet two with a [reference link](https://example.com)

> Blockquote for callouts.

| Column A | Column B |
| --- | --- |
| Row | Value |

Inline \`const x = 1\` and a block:

\`\`\`typescript
type User = { id: string; name: string };
const demo: User = { id: "1", name: "Ada" };
\`\`\`
`.trim();

export default function MdxPreview() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="MessageResponse + markdownComponents (Streamdown)">
        <div className="max-h-[min(32rem,70vh)] w-full overflow-y-auto rounded-xl border border-border bg-background p-4">
          <MessageResponse mode="static">{SAMPLE_MARKDOWN}</MessageResponse>
        </div>
      </Preview>
    </PreviewWrapper>
  );
}
