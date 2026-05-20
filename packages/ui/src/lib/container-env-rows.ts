export interface ContainerEnvRow {
  dbDsn?: ContainerEnvDbDsnReference;
  name: string;
  value: string;
  valueFrom?: unknown;
  valueSource?: "direct" | "valueFrom" | "dbDsn";
}

export type ContainerEnvDbDsnField = "private" | "public";

export interface ContainerEnvDbDsnReference {
  dbName: string;
  dbNamespace: string;
  field: ContainerEnvDbDsnField;
}

export interface ContainerEnvDbDsnSource {
  name: string;
  namespace: string;
  privateDsn?: string;
  publicDsn?: string;
}

export interface ContainerEnvDbDsnFieldOption {
  field: ContainerEnvDbDsnField;
  label: string;
  value: string;
}

export type ContainerEnvRowValidationErrorType =
  | "duplicate-name"
  | "invalid-name"
  | "missing-name";

export interface ContainerEnvRowValidationError {
  index: number;
  message: string;
  type: ContainerEnvRowValidationErrorType;
}

export interface ContainerEnvRowValidationResult {
  errors: ContainerEnvRowValidationError[];
  valid: boolean;
}

export const CONTAINER_ENV_VALUE_FROM_PLACEHOLDER = "(valueFrom)";

const K8S_ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const DEFAULT_ROW_NAME = "NEW_VARIABLE";

function nextDefaultRowName(rows: readonly ContainerEnvRow[]): string {
  const used = new Set(rows.map((row) => row.name.trim()).filter(Boolean));
  if (!used.has(DEFAULT_ROW_NAME)) {
    return DEFAULT_ROW_NAME;
  }
  let suffix = 2;
  while (used.has(`${DEFAULT_ROW_NAME}_${suffix}`)) {
    suffix += 1;
  }
  return `${DEFAULT_ROW_NAME}_${suffix}`;
}

function nonEmptyValue(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

export function isKubernetesEnvName(name: string): boolean {
  return K8S_ENV_NAME_RE.test(name);
}

export function containerEnvDbDsnFieldOptions(
  source: ContainerEnvDbDsnSource | undefined
): ContainerEnvDbDsnFieldOption[] {
  const privateDsn = nonEmptyValue(source?.privateDsn);
  const publicDsn = nonEmptyValue(source?.publicDsn);
  return [
    ...(privateDsn === undefined
      ? []
      : [
          {
            field: "private" as const,
            label: "Private DSN",
            value: privateDsn,
          },
        ]),
    ...(publicDsn === undefined
      ? []
      : [
          {
            field: "public" as const,
            label: "Public DSN",
            value: publicDsn,
          },
        ]),
  ];
}

export function containerEnvDbDsnReferenceFromValue(
  value: string,
  sources: readonly ContainerEnvDbDsnSource[]
): Pick<ContainerEnvRow, "dbDsn" | "value" | "valueSource"> | undefined {
  for (const source of sources) {
    for (const field of containerEnvDbDsnFieldOptions(source)) {
      if (field.value !== value) {
        continue;
      }
      return {
        dbDsn: {
          dbName: source.name,
          dbNamespace: source.namespace,
          field: field.field,
        },
        value,
        valueSource: "dbDsn",
      };
    }
  }
  return undefined;
}

export function normalizeContainerEnvRowsForSave(
  rows: readonly ContainerEnvRow[]
): ContainerEnvRow[] {
  return rows.map((row) => {
    const name = row.name.trim();
    if (row.valueSource === "valueFrom" && row.valueFrom != null) {
      return {
        name,
        value: CONTAINER_ENV_VALUE_FROM_PLACEHOLDER,
        valueFrom: row.valueFrom,
        valueSource: "valueFrom",
      };
    }
    if (row.valueSource === "dbDsn" && row.dbDsn != null) {
      return { name, value: row.value };
    }
    return { name, value: row.value };
  });
}

export function addContainerEnvRow(
  rows: readonly ContainerEnvRow[]
): ContainerEnvRow[] {
  return [...rows, { name: nextDefaultRowName(rows), value: "" }];
}

export function addContainerEnvDbDsnReferenceRow(
  rows: readonly ContainerEnvRow[],
  sources: readonly ContainerEnvDbDsnSource[]
): ContainerEnvRow[] {
  const source = sources.find(
    (item) => containerEnvDbDsnFieldOptions(item).length > 0
  );
  const field = containerEnvDbDsnFieldOptions(source)[0];
  if (source === undefined || field === undefined) {
    return [...rows];
  }
  return [
    ...rows,
    {
      dbDsn: {
        dbName: source.name,
        dbNamespace: source.namespace,
        field: field.field,
      },
      name: nextDefaultRowName(rows),
      value: field.value,
      valueSource: "dbDsn",
    },
  ];
}

export function updateContainerEnvRow(
  rows: readonly ContainerEnvRow[],
  index: number,
  patch: Partial<ContainerEnvRow>
): ContainerEnvRow[] {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch } : row
  );
}

export function deleteContainerEnvRow(
  rows: readonly ContainerEnvRow[],
  index: number
): ContainerEnvRow[] {
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

function valueFromKey(valueFrom: unknown): string {
  return valueFrom == null ? "" : JSON.stringify(valueFrom);
}

export function containerEnvRowsEqual(
  a: readonly ContainerEnvRow[],
  b: readonly ContainerEnvRow[]
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((row, index) => {
    const other = b[index];
    if (other == null || row.name !== other.name) {
      return false;
    }

    const rowIsExternal =
      row.valueSource === "valueFrom" && row.valueFrom != null;
    const otherIsExternal =
      other.valueSource === "valueFrom" && other.valueFrom != null;
    if (rowIsExternal !== otherIsExternal) {
      return false;
    }
    if (rowIsExternal) {
      return valueFromKey(row.valueFrom) === valueFromKey(other.valueFrom);
    }
    return row.value === other.value;
  });
}

export function validateContainerEnvRows(
  rows: readonly ContainerEnvRow[]
): ContainerEnvRowValidationResult {
  const errors: ContainerEnvRowValidationError[] = [];
  const firstIndexByName = new Map<string, number>();

  rows.forEach((row, index) => {
    const name = row.name.trim();
    if (name === "") {
      errors.push({
        index,
        message: "Environment variable name is required.",
        type: "missing-name",
      });
      return;
    }
    if (!isKubernetesEnvName(name)) {
      errors.push({
        index,
        message:
          "Use letters, digits, underscores, dots, or hyphens; do not start with a digit.",
        type: "invalid-name",
      });
      return;
    }

    if (firstIndexByName.has(name)) {
      errors.push({
        index,
        message: "Environment variable names must be unique.",
        type: "duplicate-name",
      });
      return;
    }
    firstIndexByName.set(name, index);
  });

  return { errors, valid: errors.length === 0 };
}
