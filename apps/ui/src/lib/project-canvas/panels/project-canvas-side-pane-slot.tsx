"use client";

import { SidePanePresence } from "@workspace/ui/components/side-pane";
import type { ReactNode } from "react";

export type ProjectCanvasSidePaneEntry =
  | { kind: "githubDeployment" }
  | { kind: "resource" }
  | null;

export type ProjectCanvasSidePanePreferredEntry = Exclude<
  ProjectCanvasSidePaneEntry,
  null
>["kind"];

export function resolveProjectCanvasSidePaneEntry({
  githubDeploymentPaneOpen,
  preferredEntry,
  resourcePaneOpen,
}: {
  githubDeploymentPaneOpen: boolean;
  preferredEntry?: ProjectCanvasSidePanePreferredEntry | null;
  resourcePaneOpen: boolean;
}): ProjectCanvasSidePaneEntry {
  if (preferredEntry === "githubDeployment" && githubDeploymentPaneOpen) {
    return { kind: "githubDeployment" };
  }

  if (preferredEntry === "resource" && resourcePaneOpen) {
    return { kind: "resource" };
  }

  if (githubDeploymentPaneOpen) {
    return { kind: "githubDeployment" };
  }

  if (resourcePaneOpen) {
    return { kind: "resource" };
  }

  return null;
}

export function ProjectCanvasSidePaneSlot({
  entry,
  githubDeploymentPane,
  resourcePane,
}: {
  entry: ProjectCanvasSidePaneEntry;
  githubDeploymentPane: ReactNode;
  resourcePane: ReactNode;
}) {
  let pane: ReactNode = null;

  if (entry?.kind === "githubDeployment") {
    pane = githubDeploymentPane;
  } else if (entry?.kind === "resource") {
    pane = resourcePane;
  }

  return <SidePanePresence>{pane}</SidePanePresence>;
}
