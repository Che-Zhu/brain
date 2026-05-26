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
      kind: "githubDeployment";
      placement: "overlay";
      projectUid: string;
    };

export function projectListEntryForAssistantIntent(
  intent: ProjectSidePaneAssistantIntent
): ProjectSidePaneEntry | null {
  if (intent.type !== "github") {
    return null;
  }
  return {
    entryMode: "githubDirect",
    kind: "projectCreation",
    placement: "reserved",
  };
}

export function projectCanvasEntryForAssistantIntent(
  intent: ProjectSidePaneAssistantIntent,
  { projectUid }: { projectUid: string }
): ProjectSidePaneEntry | null {
  const uid = projectUid.trim();
  if (intent.type !== "github" || uid === "") {
    return null;
  }
  return {
    kind: "githubDeployment",
    placement: "overlay",
    projectUid: uid,
  };
}
