/**
 * Set by `proxy.ts` (Next.js middleware) on `/preview/project/*` requests so the
 * segment layout — which cannot read `searchParams` — can recover the original
 * query string and run server-side share-token authorization on the same values
 * the client will use.
 */
export const PREVIEW_QUERY_HEADER = "x-preview-search" as const;
