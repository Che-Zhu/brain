export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: unknown;
  readonly requestId?: string;

  constructor(status: number, code: string, body: unknown, requestId?: string) {
    super(`[${status}] ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
    this.requestId = requestId;
  }

  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
