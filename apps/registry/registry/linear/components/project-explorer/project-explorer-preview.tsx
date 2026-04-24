"use client";

import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import {
  ProjectExplorer,
  type ProjectExplorerProject,
} from "@workspace/ui/components/project-explorer/project-explorer";
import { useState } from "react";

const sampleProjects = [
  {
    id: "proj-ledger",
    name: "Ledger service",
    createdAt: "2026-03-02T09:15:00.000Z",
  },
  {
    id: "proj-console",
    name: "Operator console",
    createdAt: "2026-02-18T16:42:00.000Z",
  },
  {
    id: "proj-data",
    name: "Analytics warehouse",
    createdAt: "2026-01-07T11:00:00.000Z",
  },
] as const;

export default function ProjectExplorerPreview() {
  const [lastId, setLastId] = useState<string | null>(null);

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="With projects">
        <div className="flex flex-col gap-2">
          <ProjectExplorer.Root
            actions={{
              onProjectClick: (p: ProjectExplorerProject) => setLastId(p.id),
            }}
            states={{ projects: [...sampleProjects] }}
          >
            <ProjectExplorer.Variant0 />
          </ProjectExplorer.Root>
          {lastId ? (
            <p className="text-muted-foreground text-xs">
              Last clicked:{" "}
              <span className="font-mono text-foreground">{lastId}</span>
            </p>
          ) : null}
        </div>
      </Preview>
      <Preview showReset={false} title="Empty state">
        <ProjectExplorer.Root
          states={{
            projects: [],
            empty: {
              title: "No projects",
              description:
                "You have not created a project in this namespace yet.",
            },
          }}
        >
          <ProjectExplorer.Variant0 />
        </ProjectExplorer.Root>
      </Preview>
    </PreviewWrapper>
  );
}
