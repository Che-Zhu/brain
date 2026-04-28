/** Resolve active namespace from raw kubeconfig text (Sealos/kubeconfig YAML). */
export function namespaceFromKubeconfig(kubeconfig: string): string {
  const matches = [...kubeconfig.matchAll(/^\s+namespace:\s*(\S+)/gm)];
  const last = matches.at(-1);
  return last?.[1] ?? "default";
}
