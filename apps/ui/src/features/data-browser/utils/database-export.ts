type DbServiceEngineType =
  | "MYSQL"
  | "POSTGRES"
  | "MONGODB"
  | "REDIS"
  | "CLICKHOUSE";
type ExportFormat = "csv" | "json" | "sql" | "excel";

interface BuildDatabaseExportPlanOptions {
  allSchemas: string[];
  dbServiceEngineType: DbServiceEngineType | undefined;
  fallbackSchema: string;
  includeSystemSchemas: boolean;
  systemSchemas: string[];
}

/** Resolve which logical schema buckets should be exported for a database export. */
export function buildDatabaseExportPlan({
  dbServiceEngineType,
  fallbackSchema,
  allSchemas,
  systemSchemas,
  includeSystemSchemas,
}: BuildDatabaseExportPlanOptions): string[] {
  if (dbServiceEngineType === "POSTGRES") {
    const filteredSchemas = includeSystemSchemas
      ? allSchemas
      : allSchemas.filter((schema) => !systemSchemas.includes(schema));
    return [...new Set(filteredSchemas)];
  }

  return fallbackSchema ? [fallbackSchema] : [];
}

/** Build the ZIP entry path for a storage unit export. */
export function formatDatabaseExportEntryName(
  dbServiceEngineType: DbServiceEngineType | undefined,
  schema: string,
  tableName: string,
  format: ExportFormat
): string {
  const filename = `${tableName}.${format === "excel" ? "xlsx" : format}`;
  if (dbServiceEngineType === "POSTGRES") {
    return `${schema}/${filename}`;
  }
  return filename;
}

/** Human-readable label for progress and partial failure messages. */
export function formatDatabaseExportTargetName(
  dbServiceEngineType: DbServiceEngineType | undefined,
  schema: string,
  tableName: string
): string {
  if (dbServiceEngineType === "POSTGRES") {
    return `${schema}.${tableName}`;
  }
  return tableName;
}
