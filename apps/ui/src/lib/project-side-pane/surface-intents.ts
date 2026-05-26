import type { ProjectCreationPaneEntryMode } from "@/components/project-creation-pane-state";
import type { ProjectSidePaneAssistantIntent } from "./controller";

export type ProjectSidePanePlacement = "overlay" | "reserved";

export type ProjectSidePaneEntry =
  | {
      entryMode: ProjectCreationPaneEntryMode;
      kind: "projectCreation";
      placement: "reserved";
    }
  | {
      kind: "databaseDeployment";
      placement: "overlay";
      projectUid: string;
    }
  | {
      kind: "dockerDeployment";
      placement: "overlay";
      projectUid: string;
    }
  | {
      kind: "githubDeployment";
      placement: "overlay";
      projectUid: string;
    };

export function projectListEntryForAssistantIntent(
  intent: ProjectSidePaneAssistantIntent
): ProjectSidePaneEntry | null {
  if (intent.type === "github") {
    return {
      entryMode: "githubDirect",
      kind: "projectCreation",
      placement: "reserved",
    };
  }
  if (intent.type === "database") {
    return {
      entryMode: "databaseDirect",
      kind: "projectCreation",
      placement: "reserved",
    };
  }
  if (intent.type === "docker") {
    return {
      entryMode: "dockerDirect",
      kind: "projectCreation",
      placement: "reserved",
    };
  }
  return null;
}

export function projectCanvasEntryForAssistantIntent(
  intent: ProjectSidePaneAssistantIntent,
  { projectUid }: { projectUid: string }
): ProjectSidePaneEntry | null {
  const uid = projectUid.trim();
  if (uid === "") {
    return null;
  }
  if (intent.type === "database") {
    return {
      kind: "databaseDeployment",
      placement: "overlay",
      projectUid: uid,
    };
  }
  if (intent.type === "docker") {
    return {
      kind: "dockerDeployment",
      placement: "overlay",
      projectUid: uid,
    };
  }
  if (intent.type !== "github") {
    return null;
  }
  return {
    kind: "githubDeployment",
    placement: "overlay",
    projectUid: uid,
  };
}
