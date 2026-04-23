"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  devEncodedKubeconfigAtom,
  devNamespaceAtom,
  encodedKubeconfigAtom,
  namespaceAtom,
} from "@/atom/auth-atom";

interface AuthBootstrapProps {
  serverEncodedKubeconfig: string;
  serverNamespace: string;
};

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
  const setEncodedKubeconfig = useSetAtom(encodedKubeconfigAtom);
  const setNamespace = useSetAtom(namespaceAtom);

  useEffect(() => {
    if (devEncodedKubeconfig !== "" || devNamespace !== "") {
      if (devEncodedKubeconfig !== "") {
        setEncodedKubeconfig(devEncodedKubeconfig);
      }
      if (devNamespace !== "") {
        setNamespace(devNamespace);
      }
      return;
    }

    const decoded = safeDecode(serverEncodedKubeconfig).trim();
    const ns = serverNamespace.trim();
    if (decoded !== "") {
      setEncodedKubeconfig(decoded);
    }
    if (ns !== "") {
      setNamespace(ns);
    }
  }, [
    devEncodedKubeconfig,
    devNamespace,
    serverEncodedKubeconfig,
    serverNamespace,
    setEncodedKubeconfig,
    setNamespace,
  ]);

  return null;
}
