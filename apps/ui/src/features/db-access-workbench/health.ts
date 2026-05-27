export type DbAccessSurfaceStateCode =
  | "db-not-ready"
  | "missing-secret"
  | "not-found"
  | "ownership"
  | "timeout"
  | "unknown-error"
  | "unsupported-engine"
  | "whodb-unavailable";

export interface DbAccessSurfaceState {
  code: DbAccessSurfaceStateCode;
  message: string;
  retryable: boolean;
  title: string;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function normalizeDbAccessHealthError(
  error: unknown
): DbAccessSurfaceState {
  const text = errorText(error);
  const lower = text.toLowerCase();

  if (lower.includes("unsupported db engine")) {
    return {
      code: "unsupported-engine",
      message: "This database engine is not supported by DB Access yet.",
      retryable: false,
      title: "Unsupported database engine",
    };
  }

  if (lower.includes("connection secret is missing")) {
    return {
      code: "missing-secret",
      message: "The database connection secret is not available yet.",
      retryable: true,
      title: "Connection secret missing",
    };
  }

  if (lower.includes("does not belong to project")) {
    return {
      code: "ownership",
      message: "This database does not belong to the current Project.",
      retryable: false,
      title: "Project ownership mismatch",
    };
  }

  if (
    lower.includes("whodb is unavailable") ||
    lower.includes("whodb_url is not configured")
  ) {
    return {
      code: "whodb-unavailable",
      message: "The DB Access backend is unavailable right now.",
      retryable: true,
      title: "DB Access unavailable",
    };
  }

  if (lower.includes("timed out") || lower.includes("api 504")) {
    return {
      code: "timeout",
      message: "The DB Access readiness check timed out.",
      retryable: true,
      title: "DB Access timed out",
    };
  }

  if (lower.includes("db is not ready")) {
    return {
      code: "db-not-ready",
      message: "The database is not ready for browsing yet.",
      retryable: true,
      title: "Database not ready",
    };
  }

  if (lower.includes("db not found")) {
    return {
      code: "not-found",
      message: "The selected database was not found.",
      retryable: false,
      title: "Database not found",
    };
  }

  return {
    code: "unknown-error",
    message: "DB Access could not check this database right now.",
    retryable: true,
    title: "DB Access failed",
  };
}
