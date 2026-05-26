import YAML from "yaml";

import { PROJECT_DISPLAY_NAME_ANNOTATION_KEY } from "./projects-to-explorer-projects";

export function mergeProjectMetadataDisplayName(
  projectYamlSingleDoc: string,
  displayName: string
): string {
  const trimmed = projectYamlSingleDoc.trim();
  const name = displayName.trim();
  if (!(trimmed && name)) {
    return trimmed;
  }
  const parsed: unknown = YAML.parse(trimmed);
  if (
    parsed == null ||
    typeof parsed !== "object" ||
    !("kind" in parsed) ||
    (parsed as { kind?: string }).kind !== "Project"
  ) {
    return trimmed;
  }

  const doc = parsed as Record<string, unknown>;
  const metadata =
    typeof doc.metadata === "object" && doc.metadata !== null
      ? { ...(doc.metadata as Record<string, unknown>) }
      : {};
  const annotations =
    typeof metadata.annotations === "object" && metadata.annotations !== null
      ? { ...(metadata.annotations as Record<string, unknown>) }
      : {};

  doc.metadata = {
    ...metadata,
    annotations: {
      ...annotations,
      [PROJECT_DISPLAY_NAME_ANNOTATION_KEY]: name,
    },
  };
  return YAML.stringify(doc).trimEnd();
}
