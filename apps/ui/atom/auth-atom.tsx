import { atom } from "jotai";

/**
 * Dev kubeconfig (encoded), from `NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG`.
 * Writable so the client can refresh or override after load.
 */
export const devEncodedKubeconfigAtom = atom(
  decodeURIComponent(process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG ?? "")
);

/**
 * Dev Kubernetes namespace, from `NEXT_PUBLIC_DEV_NS`.
 */
export const devNamespaceAtom = atom(process.env.NEXT_PUBLIC_DEV_NS ?? "");
