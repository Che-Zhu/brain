"use client";

import { useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import {
  devEncodedKubeconfigAtom,
  devNamespaceAtom,
  encodedKubeconfigAtom,
  namespaceAtom,
} from "@/store/auth-store";

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
  const devEncodedKubeconfig = useAtomValue(devEncodedKubeconfigAtom).trim();
  const devNamespace = useAtomValue(devNamespaceAtom).trim();
  const fallbackKubeconfig = safeDecode(serverEncodedKubeconfig).trim();
  const fallbackNamespace = serverNamespace.trim();

  // Dev env is an all-or-nothing override vs server: if any dev field is set,
  // never mix in server kubeconfig/namespace (no dev kubeconfig + server ns).
  const hasDevOverride =
    devEncodedKubeconfig !== "" || devNamespace !== "";
  const kubeconfig = hasDevOverride
    ? devEncodedKubeconfig
    : fallbackKubeconfig;
  const namespace = hasDevOverride ? devNamespace : fallbackNamespace;

  useHydrateAtoms([
    [encodedKubeconfigAtom, kubeconfig],
    [namespaceAtom, namespace],
  ]);

  return null;
}
