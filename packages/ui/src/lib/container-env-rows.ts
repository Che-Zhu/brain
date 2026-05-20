export interface ContainerEnvRow {
  name: string;
  value: string;
  valueFrom?: unknown;
  valueSource?: "direct" | "valueFrom";
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

export function isKubernetesEnvName(name: string): boolean {
  return K8S_ENV_NAME_RE.test(name);
}

export function normalizeContainerEnvRowsForSave(
  rows: readonly ContainerEnvRow[]
): ContainerEnvRow[] {
  return rows.map((row) => ({
    ...row,
    name: row.name.trim(),
  }));
}

export function addContainerEnvRow(
  rows: readonly ContainerEnvRow[]
): ContainerEnvRow[] {
  return [...rows, { name: nextDefaultRowName(rows), value: "" }];
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
