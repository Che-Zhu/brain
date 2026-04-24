import { atom } from "jotai";

export const encodedKubeconfigAtom = atom(
  decodeURIComponent(process.env.NEXT_PUBLIC_DEV_ENCODED_KUBECONFIG ?? "")
);

export const namespaceAtom = atom(process.env.NEXT_PUBLIC_DEV_NS ?? "");
