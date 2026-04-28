import { API_ROUTES, type ApiRoute } from "./constants";
import { fetcher } from "./fetch";

const baseUrl = () => process.env.API_URL || "http://localhost:9000";

const apiAbs = (path: ApiRoute) => `${baseUrl()}${path}`;

const authHeader = (kc: string) => ({
  Authorization: `Bearer ${encodeURIComponent(kc)}`,
});

async function k8sApply(kc: string, body: string | Blob): Promise<void> {
  const yaml = typeof body === "string" ? body : await (body as Blob).text();
  await fetcher({
    base: baseUrl(),
    path: apiAbs(API_ROUTES.k8s.apply),
    method: "POST",
    header: {
      ...authHeader(kc),
      "Content-Type": "application/json",
    },
    body: { yaml },
  });
}

const GHCR_CRED_SECRET_NAME = "ghcr-cred" as const;
const GHCR_CRED_TOKEN_KEY = "githubToken" as const;

/** Create/update GHCR Docker config secret (`ghcr-cred`) in the namespace. */
export async function applyGhcrSecret(
  kc: string,
  params: { namespace: string; githubToken: string; owner: string }
): Promise<void> {
  const { namespace, githubToken, owner } = params;
  const auth = Buffer.from(`${owner}:${githubToken}`, "utf8").toString(
    "base64"
  );
  const yaml = `apiVersion: v1
kind: Secret
metadata:
  name: ${GHCR_CRED_SECRET_NAME}
  namespace: ${namespace}
type: kubernetes.io/dockerconfigjson
stringData:
  ${GHCR_CRED_TOKEN_KEY}: ${githubToken}
  .dockerconfigjson: |
    {
      "auths": {
        "ghcr.io": {
          "auth": "${auth}",
          "email": "unused@example.com"
        }
      }
    }
`;
  await k8sApply(kc, yaml);
}
