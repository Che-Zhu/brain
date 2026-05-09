/**
 * Bun-only manual smoke test for {@link createVercelSandboxFromEnv}.
 *
 * Cannot run via `bun run` against the production module because that file is
 * marked `server-only`, which throws unless the `react-server` export
 * condition is set (the resolver Next uses for Server Components).
 *
 * From `apps/ui`:
 *
 * ```bash
 * bun run --conditions=react-server ./src/lib/vercel-sandbox.smoke.ts
 * ```
 *
 * Requires Vercel auth (same as {@link createVercelSandboxFromEnv}) plus:
 *
 * - **`NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG`** — URL-encoded
 *   (`encodeURIComponent`) kubeconfig file contents.
 * - **`DEV_HTTPS_PROXY`** or **`HTTPS_PROXY`** — copied into the sandbox
 *   command environment as `HTTPS_PROXY` / `https_proxy` as-is.
 *
 * Writes the kubeconfig to `/tmp/kubeconfig` in the VM, installs `kubectl`
 * from `dl.k8s.io`, exports proxy-related env in the script, then runs
 * `kubectl get pods -n ns-admin -o json`.
 */

import {
  createVercelSandboxFromEnv,
  writeSandboxTextFile,
} from "./vercel-sandbox";

function proxyEnvFromProcess(): Record<string, string> {
  const proxy = process.env.DEV_HTTPS_PROXY;
  if (proxy === undefined || proxy === "") {
    return {};
  }
  return { HTTPS_PROXY: proxy, https_proxy: proxy };
}

function decodeKubeconfigFromEnv(): string {
  const kubeconfigUrlEncoded =
    process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG ?? "";
  if (kubeconfigUrlEncoded === "") {
    throw new Error(
      "Set NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG (URL-encoded kubeconfig)"
    );
  }
  let kubeconfigYaml: string;
  try {
    kubeconfigYaml = decodeURIComponent(kubeconfigUrlEncoded);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG is not valid URL-encoded text"
    );
  }
  if (!kubeconfigYaml.includes("apiVersion:")) {
    throw new Error(
      "Decoded kubeconfig does not look like YAML (missing apiVersion)"
    );
  }
  return kubeconfigYaml;
}

const KUBECTL_INSTALL_AND_LIST_PODS = `
set -euo pipefail
export HTTPS_PROXY="\${HTTPS_PROXY:-}"
export https_proxy="\${https_proxy:-\${HTTPS_PROXY:-}}"
KUBECTL_VERSION=$(curl -Ls https://dl.k8s.io/release/stable.txt)
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) KUBECTL_ARCH=amd64 ;;
  aarch64) KUBECTL_ARCH=arm64 ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac
echo "Installing kubectl \${KUBECTL_VERSION} linux/\${KUBECTL_ARCH}" >&2
curl -Lf "https://dl.k8s.io/release/\${KUBECTL_VERSION}/bin/linux/\${KUBECTL_ARCH}/kubectl" -o /tmp/kubectl
chmod +x /tmp/kubectl
exec /tmp/kubectl get pods -n ns-admin -o json
`.trim();

async function runSmokeTest(): Promise<void> {
  const proxyEnv = proxyEnvFromProcess();
  const kubeconfigYaml = decodeKubeconfigFromEnv();

  const sandbox = await createVercelSandboxFromEnv({
    env: { NODE_ENV: "production" },
  });
  try {
    await writeSandboxTextFile(sandbox, "/tmp/kubeconfig", kubeconfigYaml);

    const finished = await sandbox.runCommand({
      cmd: "bash",
      args: ["-c", KUBECTL_INSTALL_AND_LIST_PODS],
      env: { KUBECONFIG: "/tmp/kubeconfig", ...proxyEnv },
    });

    const stdout = await finished.stdout();
    const stderr = await finished.stderr();
    let pods: unknown = null;
    try {
      pods = JSON.parse(stdout) as unknown;
    } catch {
      pods = stdout.trimEnd();
    }
    console.log(
      JSON.stringify(
        {
          name: sandbox.name,
          exitCode: finished.exitCode,
          pods,
          stderr: stderr.trimEnd() || undefined,
        },
        null,
        2
      )
    );
    if (finished.exitCode !== 0) {
      throw new Error(
        `kubectl get pods exited with code ${String(finished.exitCode)}`
      );
    }
  } finally {
    await sandbox.stop({ blocking: true });
  }
}

const isBunEntrypoint =
  typeof import.meta !== "undefined" &&
  (import.meta as { main?: boolean }).main === true;

if (isBunEntrypoint) {
  runSmokeTest().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
