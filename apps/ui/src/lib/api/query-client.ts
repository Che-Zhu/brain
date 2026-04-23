import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./errors";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchIntervalInBackground: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.retryable) {
            return false;
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: 1,
      },
    },
  });
}
