import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PREVIEW_QUERY_HEADER } from "@/lib/preview-search-header";

/**
 * `layout` cannot read `searchParams` (Next.js: layouts are not re-run on search changes).
 * Forward the current query so the preview segment layout can run `assertPreviewShareAuthorized`
 * on the same values the client will use.
 */
export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/preview/project/")) {
    return NextResponse.next();
  }
  const h = new Headers(request.headers);
  h.set(PREVIEW_QUERY_HEADER, request.nextUrl.search);
  return NextResponse.next({ request: { headers: h } });
}

export const config = {
  matcher: "/preview/project/:path*",
};
