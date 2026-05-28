import type { SqlDialect } from "@data-browser/utils/ddl-sql";

/** Column definition for the Edit Table columns tab. */
export interface ColumnDefinition {
  id: string;
  isMarkedForDeletion?: boolean;
  isNew?: boolean;
  isNullable: boolean;
  isPrimaryKey: boolean;
  name: string;
  type: string;
}

/** Index definition for the Edit Table indexes tab. */
export interface IndexDefinition {
  columns: string[];
  id: string;
  isMarkedForDeletion?: boolean;
  isNew?: boolean;
  isUnique: boolean;
  name: string;
  type: string;
}

/** Foreign key definition for the Edit Table foreign keys tab. */
export interface ForeignKeyDefinition {
  column: string;
  id: string;
  isMarkedForDeletion?: boolean;
  isNew?: boolean;
  name: string;
  onDelete: string;
  onUpdate: string;
  referencedColumn: string;
  referencedTable: string;
}

export type EditTableTab = "fields" | "indexes" | "foreignKeys";

/** Result of a single DDL operation within a batch apply. */
export interface OperationResult {
  label: string;
  message: string;
  sql?: string;
  success: boolean;
}

/** State exposed by EditTableProvider. */
export interface EditTableState {
  activeTab: EditTableTab;
  /** Column names derived from current columns, used by index column selectors and FK column selectors. */
  columnNames: string[];
  columns: ColumnDefinition[];
  dialect: SqlDialect;
  foreignKeys: ForeignKeyDefinition[];
  indexes: IndexDefinition[];
  isExecuting: boolean;
  isLoading: boolean;
  /** Number of pending changes across all tabs. */
  pendingChangeCount: number;
}

/** Actions exposed by EditTableProvider. */
export interface EditTableActions {
  // Column operations
  addColumn: () => void;
  // Foreign key operations
  addForeignKey: () => void;
  // Index operations
  addIndex: () => void;
  /** Apply all pending changes (additions, modifications, deletions) as a batch. */
  applyAllChanges: () => Promise<void>;
  setActiveTab: (tab: EditTableTab) => void;
  /** Remove a new (unsaved) column from the list, or toggle deletion mark on an existing column. */
  toggleColumnDeletion: (col: ColumnDefinition) => void;
  /** Remove a new (unsaved) FK from the list, or toggle deletion mark on an existing FK. */
  toggleForeignKeyDeletion: (fk: ForeignKeyDefinition) => void;
  /** Remove a new (unsaved) index from the list, or toggle deletion mark on an existing index. */
  toggleIndexDeletion: (idx: IndexDefinition) => void;
  updateColumn: (
    id: string,
    field: keyof ColumnDefinition,
    value: string | boolean
  ) => void;
  updateForeignKey: (
    id: string,
    field: keyof ForeignKeyDefinition,
    value: string
  ) => void;
  updateIndex: (
    id: string,
    field: keyof IndexDefinition,
    value: string | boolean | string[]
  ) => void;
}

/** Combined context value for EditTable. */
export interface EditTableContextValue {
  actions: EditTableActions;
  state: EditTableState;
}
