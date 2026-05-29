"use client";

import { SidePanePresence } from "@workspace/ui/components/side-pane";
import type { ReactNode } from "react";

export type ProjectCanvasSidePaneEntry =
  | { kind: "databaseDeployment" }
  | { kind: "dockerDeployment" }
  | { kind: "githubDeployment" }
  | { kind: "resource" }
  | { kind: "skillLibrary" }
  | null;

export type ProjectCanvasSidePanePreferredEntry = Exclude<
  ProjectCanvasSidePaneEntry,
  null
>["kind"];

export function resolveProjectCanvasSidePaneEntry({
  databaseDeploymentPaneOpen,
  dockerDeploymentPaneOpen,
  githubDeploymentPaneOpen,
  preferredEntry,
  resourcePaneOpen,
  skillLibraryPaneOpen,
}: {
  databaseDeploymentPaneOpen?: boolean;
  dockerDeploymentPaneOpen?: boolean;
  githubDeploymentPaneOpen: boolean;
  preferredEntry?: ProjectCanvasSidePanePreferredEntry | null;
  resourcePaneOpen: boolean;
  skillLibraryPaneOpen?: boolean;
}): ProjectCanvasSidePaneEntry {
  if (preferredEntry === "databaseDeployment" && databaseDeploymentPaneOpen) {
    return { kind: "databaseDeployment" };
  }

  if (preferredEntry === "dockerDeployment" && dockerDeploymentPaneOpen) {
    return { kind: "dockerDeployment" };
  }

  if (preferredEntry === "githubDeployment" && githubDeploymentPaneOpen) {
    return { kind: "githubDeployment" };
  }

  if (preferredEntry === "skillLibrary" && skillLibraryPaneOpen) {
    return { kind: "skillLibrary" };
  }

  if (preferredEntry === "resource" && resourcePaneOpen) {
    return { kind: "resource" };
  }

  if (githubDeploymentPaneOpen) {
    return { kind: "githubDeployment" };
  }

  if (databaseDeploymentPaneOpen) {
    return { kind: "databaseDeployment" };
  }

  if (dockerDeploymentPaneOpen) {
    return { kind: "dockerDeployment" };
  }

  if (skillLibraryPaneOpen) {
    return { kind: "skillLibrary" };
  }

  if (resourcePaneOpen) {
    return { kind: "resource" };
  }

  return null;
}

export function ProjectCanvasSidePaneSlot({
  databaseDeploymentPane,
  dockerDeploymentPane,
  entry,
  githubDeploymentPane,
  resourcePane,
  skillLibraryPane,
}: {
  databaseDeploymentPane?: ReactNode;
  dockerDeploymentPane?: ReactNode;
  entry: ProjectCanvasSidePaneEntry;
  githubDeploymentPane: ReactNode;
  resourcePane: ReactNode;
  skillLibraryPane?: ReactNode;
}) {
  let pane: ReactNode = null;

  if (entry?.kind === "databaseDeployment") {
    pane = databaseDeploymentPane;
  } else if (entry?.kind === "dockerDeployment") {
    pane = dockerDeploymentPane;
  } else if (entry?.kind === "githubDeployment") {
    pane = githubDeploymentPane;
  } else if (entry?.kind === "skillLibrary") {
    pane = skillLibraryPane;
  } else if (entry?.kind === "resource") {
    pane = resourcePane;
  }

  return <SidePanePresence>{pane}</SidePanePresence>;
}
