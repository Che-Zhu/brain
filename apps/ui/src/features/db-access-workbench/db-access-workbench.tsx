"use client";

import { Button } from "@workspace/ui/components/button";
import { useCallback, useEffect, useState } from "react";

import type { DbAccessAdapter } from "./adapter";
import type { DbAccessSurfaceState } from "./health";
import { normalizeDbAccessHealthError } from "./health";
import type { DbAccessWorkbenchContext } from "./types";

export interface DbAccessWorkbenchProps {
  adapter?: DbAccessAdapter;
  context: DbAccessWorkbenchContext;
  onRetry?: () => void;
  surfaceState?: DbAccessSurfaceState;
}

export function DbAccessWorkbench({
  adapter,
  context,
  onRetry,
  surfaceState,
}: DbAccessWorkbenchProps) {
  const [computedState, setComputedState] =
    useState<DbAccessSurfaceState | null>(surfaceState ?? null);
  const [ready, setReady] = useState(false);
  const title = context.version
    ? `${context.engine} ${context.version}`
    : context.engine;
  const activeState = surfaceState ?? computedState;

  const checkHealth = useCallback(async () => {
    if (adapter == null || surfaceState != null) {
      return;
    }
    setReady(false);
    setComputedState(null);
    try {
      await adapter.checkHealth();
      setReady(true);
    } catch (error) {
      setComputedState(normalizeDbAccessHealthError(error));
    }
  }, [adapter, surfaceState]);

  useEffect(() => {
    checkHealth().catch(() => undefined);
  }, [checkHealth]);

  return (
    <section
      aria-label="DB Access Workbench"
      className="flex h-full min-h-0 flex-col bg-background text-foreground"
      data-slot="db-access-workbench"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="min-w-0 text-center">
          <p className="truncate font-medium text-foreground text-sm">
            {context.databaseName}
          </p>
          <p className="mt-1 truncate text-muted-foreground text-xs">{title}</p>
          {activeState == null ? (
            <p className="mt-4 text-muted-foreground text-sm" role="status">
              {ready
                ? "DB Access is ready."
                : "Checking DB Access readiness..."}
            </p>
          ) : (
            <div
              aria-live="polite"
              className="mt-5 flex max-w-md flex-col items-center gap-3"
              role="status"
            >
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                  {activeState.title}
                </p>
                <p className="text-muted-foreground text-sm">
                  {activeState.message}
                </p>
              </div>
              {activeState.retryable ? (
                <Button
                  onClick={onRetry ?? checkHealth}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Retry
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
