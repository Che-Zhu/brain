import type { DatabaseDeploymentChoice } from "@workspace/ui/components/database-deployer";
import type { CompositionListItem } from "@/lib/crossplane-composition-list";

const ENGINE_LABELS: Record<string, string> = {
  mongodb: "MongoDB",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  redis: "Redis",
};
const DB_COMPOSITION_ENGINE_RE = /^dbs-([a-z0-9-]+?)-kubeblocks/;

function engineFromCompositionName(name: string): string {
  const match = DB_COMPOSITION_ENGINE_RE.exec(name.trim());
  return match?.[1] ?? "";
}

export function databaseEngineLabel(engine: string, fallback: string): string {
  const normalized = engine.trim().toLowerCase();
  return ENGINE_LABELS[normalized] ?? fallback.trim() ?? engine.trim();
}

export function dbDeploymentChoicesFromCompositionRows(
  rows: readonly CompositionListItem[] | undefined
): DatabaseDeploymentChoice[] {
  return (rows ?? []).map((row) => {
    const compositionName = row.metadata.compositionName;
    const engine =
      row.metadata.engine?.trim() ||
      engineFromCompositionName(compositionName) ||
      row.name.trim().toLowerCase();
    return {
      engine,
      iconUrl: row.iconUrl,
      id: compositionName,
      label: databaseEngineLabel(engine, row.name),
      template: row.template,
    };
  });
}
