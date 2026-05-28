import type { GetStorageUnitRowsQuery } from "@data-browser/generated/graphql";

/**
 * Data format expected by TableDetailView and related components.
 */
export interface TableData {
  /** Column names in display order. */
  columns: string[];
  /** Column type name keyed by column name. */
  columnTypes: Record<string, string>;
  /** Whether row editing is disabled for this storage unit. */
  disableUpdate: boolean;
  /** Column names that are foreign keys. */
  foreignKeyColumns: string[];
  /** Primary key column name, if any. */
  primaryKey: string | null;
  /** Row objects: { columnName: cellValue }. */
  rows: Record<string, string>[];
  /** Total row count (server-side, for pagination). */
  total: number;
}

/**
 * Convert a GraphQL RowsResult into the format TableDetailView expects.
 */
export function transformRowsResult(
  result: GetStorageUnitRowsQuery["Row"]
): TableData {
  const columns = result.Columns.map((c) => c.Name);

  const columnTypes: Record<string, string> = {};
  for (const col of result.Columns) {
    columnTypes[col.Name] = col.Type;
  }

  const rows = result.Rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < result.Columns.length; i++) {
      const column = result.Columns[i];
      if (!column) {
        continue;
      }
      obj[column.Name] = row[i] ?? "";
    }
    return obj;
  });

  const primaryKey = result.Columns.find((c) => c.IsPrimary)?.Name ?? null;

  const foreignKeyColumns = result.Columns.filter((c) => c.IsForeignKey).map(
    (c) => c.Name
  );

  return {
    columns,
    columnTypes,
    rows,
    primaryKey,
    foreignKeyColumns,
    total: result.TotalCount,
    disableUpdate: result.DisableUpdate,
  };
}
