import {
  type SortCondition,
  SortDirection,
  useGetStorageUnitRowsLazyQuery,
  type WhereCondition,
  WhereConditionType,
} from "@data-browser/generated/graphql";
import { useI18n } from "@data-browser/i18n/useI18n";
import { useConnectionStore } from "@data-browser/stores/useConnectionStore";
import { resolveSchemaParam } from "@data-browser/utils/database-features";
import {
  type TableData,
  transformRowsResult,
} from "@data-browser/utils/graphql-transforms";
import {
  mergeSearchWithWhere,
  parseSearchToWhereCondition,
} from "@data-browser/utils/search-parser";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FilterCondition } from "./types";

interface UseDataQueryParams {
  connectionId: string;
  currentPage: number;
  databaseName: string;
  filterConditions: FilterCondition[];
  /** Called once when query returns columns and no visible columns are set yet. */
  onInitVisibleColumns: (columns: string[]) => void;
  pageSize: number;
  schema?: string;
  searchTerm: string;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  tableName: string;
  visibleColumnsCount: number;
}

/** State returned by useDataQuery. */
export interface DataQueryState {
  canEdit: boolean;
  data: TableData | null;
  error: string | null;
  foreignKeyColumns: string[];
  loading: boolean;
  primaryKey: string | null;
  total: number;
  totalPages: number;
}

/** Actions returned by useDataQuery. */
export interface DataQueryActions {
  handleSubmitRequest: (overridePageOffset?: number) => Promise<void>;
  refresh: () => void;
}

/** Hook that owns data fetching, loading/error state, and race condition prevention for TableView. */
export function useDataQuery(params: UseDataQueryParams): {
  state: DataQueryState;
  actions: DataQueryActions;
} {
  const { t } = useI18n();
  const {
    connectionId,
    databaseName,
    schema,
    tableName,
    currentPage,
    pageSize,
    searchTerm,
    sortColumn,
    sortDirection,
    filterConditions,
    visibleColumnsCount,
    onInitVisibleColumns,
  } = params;

  const { connections, tableRefreshKey } = useConnectionStore();

  const [getRows] = useGetStorageUnitRowsLazyQuery({ fetchPolicy: "no-cache" });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);
  const [foreignKeyColumns, setForeignKeyColumns] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const latestRequestIdRef = useRef(0);
  const filterConditionsRef = useRef(filterConditions);
  const columnsRef = useRef<{ names: string[]; types: string[] }>({
    names: [],
    types: [],
  });

  // Keep refs in sync
  useEffect(() => {
    filterConditionsRef.current = filterConditions;
  }, [filterConditions]);

  useEffect(() => {
    if (data?.columns && data.columns.length > 0) {
      columnsRef.current = {
        names: data.columns,
        types: data.columns.map((c) => data.columnTypes[c] ?? "string"),
      };
    }
  }, [data?.columns, data?.columnTypes]);

  const handleSubmitRequest = useCallback(
    async (overridePageOffset?: number) => {
      const conn = connections.find((c) => c.id === connectionId);
      if (!conn) {
        return;
      }

      setLoading(true);
      setError(null);

      latestRequestIdRef.current += 1;
      const thisRequestId = latestRequestIdRef.current;

      const graphqlSchema = resolveSchemaParam(conn.type, databaseName, schema);

      // Build sort condition
      const sort: SortCondition[] | undefined =
        sortColumn && sortDirection
          ? [
              {
                Column: sortColumn,
                Direction:
                  sortDirection === "asc"
                    ? SortDirection.Asc
                    : SortDirection.Desc,
              },
            ]
          : undefined;

      // Build filter where condition
      const currentFilters = filterConditionsRef.current;
      let filterWhere: WhereCondition | undefined;
      if (currentFilters.length > 0) {
        const noValueOperators = ["IS NULL", "IS NOT NULL"];
        const atomicConditions: WhereCondition[] = currentFilters
          .filter(
            (fc) =>
              fc.column &&
              fc.operator &&
              (noValueOperators.includes(fc.operator) || fc.value !== "")
          )
          .map((fc) => ({
            Type: WhereConditionType.Atomic,
            Atomic: {
              Key: fc.column,
              Operator: fc.operator,
              Value: fc.value ?? "",
              ColumnType: data?.columnTypes[fc.column] ?? "string",
            },
          }));

        if (atomicConditions.length === 1) {
          filterWhere = atomicConditions[0];
        } else if (atomicConditions.length > 1) {
          filterWhere = {
            Type: WhereConditionType.And,
            And: { Children: atomicConditions },
          };
        }
      }

      // Build search where condition
      const searchWhere = searchTerm.trim()
        ? parseSearchToWhereCondition(
            searchTerm,
            columnsRef.current.names,
            columnsRef.current.types
          )
        : undefined;

      const where = mergeSearchWithWhere(searchWhere, filterWhere);

      try {
        const { data: result, error: queryError } = await getRows({
          variables: {
            schema: graphqlSchema,
            storageUnit: tableName,
            where,
            sort,
            pageSize,
            pageOffset: overridePageOffset ?? (currentPage - 1) * pageSize,
          },
          context: { database: databaseName },
        });

        if (thisRequestId !== latestRequestIdRef.current) {
          return;
        }

        if (queryError) {
          setError(queryError.message);
          return;
        }

        if (result?.Row) {
          const tableData = transformRowsResult(result.Row);
          setData(tableData);
          setPrimaryKey(tableData.primaryKey);
          setForeignKeyColumns(tableData.foreignKeyColumns);
          if (visibleColumnsCount === 0 && tableData.columns.length > 0) {
            onInitVisibleColumns(tableData.columns);
          }
        }
      } catch (err: any) {
        if (thisRequestId !== latestRequestIdRef.current) {
          return;
        }
        setError(err.message || t("sql.table.errorFetchData"));
      } finally {
        if (thisRequestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      connections,
      connectionId,
      databaseName,
      schema,
      tableName,
      sortColumn,
      sortDirection,
      searchTerm,
      pageSize,
      currentPage,
      getRows,
      visibleColumnsCount,
      onInitVisibleColumns,
      t,
    ]
  );

  // Fetch on mount and when data-changing params change
  useEffect(() => {
    handleSubmitRequest();
  }, [handleSubmitRequest, refreshKey, tableRefreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const canEdit = false;
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    state: {
      loading,
      data,
      error,
      primaryKey,
      foreignKeyColumns,
      total,
      totalPages,
      canEdit,
    },
    actions: { refresh, handleSubmitRequest },
  };
}
