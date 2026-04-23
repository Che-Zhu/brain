export type ResourceId = string & { readonly __brand: "ResourceId" };
export type EdgeId = string & { readonly __brand: "EdgeId" };
export type JobId = string & { readonly __brand: "JobId" };

export type NodeType = "container" | "database" | "devEnv" | "entry";
export type EdgeKind = "depends-on" | "connects-to" | "routes-to";

export interface NodeRef {
  id: ResourceId;
  position: { x: number; y: number };
  type: NodeType;
}

export interface EdgeRef {
  id: EdgeId;
  kind: EdgeKind;
  source: ResourceId;
  target: ResourceId;
}
