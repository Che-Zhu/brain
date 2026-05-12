"use client";

import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { ProjectCreator } from "@workspace/ui/components/project-creator/project-creator";
import { useState } from "react";

export default function ProjectCreatorPreview() {
  const [last, setLast] = useState<string | null>(null);

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="New project flow (preset)">
        <div className="flex flex-col gap-4">
          <ProjectCreator.Root
            actions={{
              onDatabaseConfirm: (id) => setLast(`database:${id}`),
              onDockerConfirm: (ref) => setLast(`docker:${ref}`),
              onGithubConfirm: (url) => setLast(`github:${url}`),
            }}
          >
            <ProjectCreator.Variant1 className="w-full min-w-0 max-w-md rounded-xl border border-border bg-card p-4" />
          </ProjectCreator.Root>
          {last ? (
            <p className="text-muted-foreground text-xs">
              Last confirm:{" "}
              <span className="font-mono text-foreground">{last}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Pick a source, confirm, or reset with the &quot;New&quot; crumb.
            </p>
          )}
        </div>
      </Preview>
      <Preview showReset={false} title="Composable (custom shell)">
        <ProjectCreator.Root
          actions={{
            onGithubConfirm: () => setLast("github (custom layout)"),
          }}
        >
          <div className="w-full min-w-0 max-w-md rounded-xl border border-border bg-muted/30 p-4">
            <ProjectCreator.Trail className="mb-4" />
            <ProjectCreator.Stage />
          </div>
        </ProjectCreator.Root>
      </Preview>
    </PreviewWrapper>
  );
}
