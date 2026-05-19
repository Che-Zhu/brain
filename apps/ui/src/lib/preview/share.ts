import "server-only";

import { API_ROUTES, type ApiRoute } from "@workspace/api/constants";
import { k8sGetQuerySchema } from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import { unauthorized } from "next/navigation";
import { authInfo, authWarn, secretMeta } from "@/lib/auth-log";

/**
 * Replays the list request used by the preview route: `kind=aps` with project UID
 * label selector and `shareToken` in the query. The API returns 401 for
 * invalid/malformed JWTs and 403 for non-public / forbidden share access.
 */
export async function assertPreviewShareAuthorized(input: {
  namespace: string;
  projectUid: string;
  shareToken: string;
}): Promise<void> {
  authInfo("preview share: validating access", {
    projectUid: input.projectUid,
    namespace: input.namespace,
    shareToken: secretMeta(input.shareToken),
  });

  const getParams = k8sGetQuerySchema.parse({
    kind: "aps",
    namespace: input.namespace,
    "label-selector": `${PROJECT_UID_LABEL}=${input.projectUid}`,
  });
  const url = new URL(ApiUrl(API_ROUTES.k8s.get as ApiRoute));
  for (const [k, v] of Object.entries({
    ...getParams,
    shareToken: input.shareToken,
  })) {
    if (v != null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, { cache: "no-store", method: "GET" });
  if (res.status === 401 || res.status === 403) {
    authWarn("preview share: unauthorized", {
      status: res.status,
      projectUid: input.projectUid,
      namespace: input.namespace,
    });
    unauthorized();
  }
  if (!res.ok) {
    authWarn("preview share: validation failed", {
      status: res.status,
      projectUid: input.projectUid,
      namespace: input.namespace,
    });
    throw new Error(`Preview could not be validated (${res.status})`);
  }

  authInfo("preview share: authorized", {
    projectUid: input.projectUid,
    namespace: input.namespace,
  });
}
