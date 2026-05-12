"use client";

import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { RawEditor } from "@workspace/ui/components/raw-editor";
import { useState } from "react";

const SAMPLE_ENV = [
  { name: "NODE_ENV", value: "production" },
  { name: "PORT", value: "3000" },
  { name: "FEATURE_FLAGS", value: "logs,metrics" },
];

export default function RawEditorPreview() {
  const [savedSummary, setSavedSummary] = useState<string | null>(null);

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview
        className="min-h-0 flex-1 flex-col"
        containerClassName="flex max-w-2xl min-h-[min(320px,50vh)] flex-col gap-3"
        title="Raw editor"
      >
        <RawEditor.Variant0
          className="min-h-0 flex-1"
          initialEnv={SAMPLE_ENV}
          onSubmit={async (env) => {
            setSavedSummary(`${String(env.length)} variable(s)`);
            await Promise.resolve();
          }}
        />
        {savedSummary == null ? null : (
          <p className="text-muted-foreground text-xs" role="status">
            Last save: parsed {savedSummary}.
          </p>
        )}
      </Preview>
    </PreviewWrapper>
  );
}
