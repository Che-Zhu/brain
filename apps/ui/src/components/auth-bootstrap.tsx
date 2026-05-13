"use client";

import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useEffect } from "react";
import { scheduleChatSandboxWarmup } from "@/lib/vercel-sandbox.actions";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

/**
 * Hydrates kubeconfig / namespace into Jotai from server props or dev env overrides.
 *
 * Access control: {@link fetchProjectCredentialsOrUnauthorized} in `app/project/layout.tsx`
 * calls `unauthorized()` from `next/navigation` when SealOS credentials are empty and there is
 * no dev bypass (`NEXT_PUBLIC_DEV_*`). That must stay on the server — `unauthorized()` cannot be
 * invoked from this client module.
 */

interface AuthBootstrapProps {
  serverEncodedKubeconfig: string;
  serverNamespace: string;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export default function AuthBootstrap({
  serverEncodedKubeconfig,
  serverNamespace,
}: AuthBootstrapProps) {
  const devEncodedKubeconfig = safeDecode(
    process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG ?? ""
  ).trim();
  const devNamespace = (process.env.NEXT_PUBLIC_DEV_NS ?? "").trim();
  const fallbackKubeconfig = safeDecode(serverEncodedKubeconfig).trim();
  const fallbackNamespace = serverNamespace.trim();

  // Dev env is an all-or-nothing override vs server: if any dev field is set,
  // never mix in server kubeconfig/namespace (no dev kubeconfig + server ns).
  const hasDevOverride = devEncodedKubeconfig !== "" || devNamespace !== "";
  const kubeconfig = hasDevOverride ? devEncodedKubeconfig : fallbackKubeconfig;
  const namespace = hasDevOverride ? devNamespace : fallbackNamespace;

  useHydrateAtoms([
    [kubeconfigAtom, kubeconfig],
    [namespaceAtom, namespace],
  ]);

  return null;
}

/**
 * Dispatches {@link scheduleChatSandboxWarmup} once the hydrated kubeconfig is non-empty.
 * Sandbox work runs on the server after the action resolves (does not block the UI).
 */
export function SandboxBootstrap() {
  const kubeconfig = useAtomValue(kubeconfigAtom);

  useEffect(() => {
    const kubeconfigDecoded = kubeconfig.trim();
    if (kubeconfigDecoded === "") {
      return;
    }

    const run = async () => {
      try {
        const result = await scheduleChatSandboxWarmup(
          encodeURIComponent(kubeconfigDecoded)
        );
        if (!result.ok) {
          console.warn("[SandboxBootstrap] skipped: invalid kubeconfig");
        }
      } catch (e: unknown) {
        console.warn("[SandboxBootstrap] schedule failed:", e);
      }
    };

    run().catch(() => undefined);
  }, [kubeconfig]);

  return null;
}
