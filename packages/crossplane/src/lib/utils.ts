import type { K8sResource } from "@/schemas/k8s-resource-schema";

export function getK8sName(r: K8sResource): string {
  return r.metadata.name;
}

export function getK8sUid(r: K8sResource): string {
  return r.metadata.uid ?? "";
}

export function getK8sResourceType(r: K8sResource): string {
  return r.kind.toLowerCase();
}

export function getK8sDisplayName(r: K8sResource): string {
  return r.metadata.name;
}

export function isK8sInstance(r: K8sResource): boolean {
  return r.kind?.toLowerCase() === "instance";
}
