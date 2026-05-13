import { API_ROUTES } from "@workspace/api/constants";
import { fetcher } from "@workspace/api/fetch";
import { k8sGetQuerySchema } from "@workspace/api/schemas/k8s-get";
import { ApiUrl } from "@workspace/api/utils";

import type { ProjectListItem } from "@/lib/projects-to-explorer-projects";

const RETRIES = 8;
const DELAY_MS = 250;

/**
 * GET the Project claim by name and read `metadata.uid` (route segment for `/project/[uid]`).
 * Retries briefly — the API server may not return the object immediately after apply.
 */
export async function fetchProjectUidByName(
  kubeconfig: string,
  namespace: string,
  name: string
): Promise<string | undefined> {
  const query = k8sGetQuerySchema.parse({
    kind: "projects",
    name,
    ...(namespace ? { namespace } : {}),
  });
  const header = {
    Authorization: `Bearer ${encodeURIComponent(kubeconfig)}`,
  };
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => {
        setTimeout(r, DELAY_MS);
      });
    }
    try {
      const raw = await fetcher<unknown>({
        base: ApiUrl(),
        path: API_ROUTES.k8s.get,
        query,
        method: "GET",
        header,
      });
      const uid = (raw as ProjectListItem | null | undefined)?.metadata?.uid;
      if (typeof uid === "string" && uid !== "") {
        return uid;
      }
    } catch {
      // claim may not be visible yet
    }
  }
  return undefined;
}
