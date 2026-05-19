import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AppShellSolo } from "@/components/app-shell";
import { authWarn, secretMeta } from "@/lib/auth-log";
import { PREVIEW_QUERY_HEADER } from "@/lib/preview/headers";
import { assertPreviewShareAuthorized } from "@/lib/preview/share";

function searchFromHeader(search: string): {
  namespace: string;
  shareToken: string;
} {
  const s = search.startsWith("?") ? search : `?${search}`;
  const sp = new URLSearchParams(s);
  return {
    namespace: (sp.get("ns") ?? "").trim(),
    shareToken: (sp.get("shareToken") ?? "").trim(),
  };
}

/**
 * Public preview: `/preview/project/{uid}?ns=...&shareToken=...`
 * Server auth runs here. Query is not available on `layout` in Next.js; it is forwarded
 * on the request via `middleware` + {@link PREVIEW_QUERY_HEADER}. Client UI is `page.tsx`.
 */
export default async function PreviewProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ uid: string }>;
}) {
  const { uid: rawUid } = await params;
  const uid = decodeURIComponent(rawUid ?? "");
  const h = await headers();
  const search = h.get(PREVIEW_QUERY_HEADER) ?? "";
  const { namespace, shareToken } = searchFromHeader(search);
  if (uid !== "" && namespace !== "" && shareToken !== "") {
    await assertPreviewShareAuthorized({
      projectUid: uid,
      namespace,
      shareToken,
    });
  } else {
    authWarn("preview layout: skipping share validation — missing params", {
      projectUid: uid || "(empty)",
      namespace: namespace || "(empty)",
      shareToken: secretMeta(shareToken),
    });
  }
  return <AppShellSolo>{children}</AppShellSolo>;
}

export const dynamic = "force-dynamic";
