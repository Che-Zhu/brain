import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { Edge, Node } from "@xyflow/react";

import {
  CANVAS_CONTAINER_NODE_TYPE,
  CANVAS_DATABASE_NODE_TYPE,
  CANVAS_ENTRY_NODE_TYPE,
} from "../nodes/constants";

export type CanvasDetectedConnectionKind = "EntryPointToAP" | "APToDB";
export type CanvasConnectionResourceKind = "AP" | "DB" | "EntryPoint";

export interface CanvasConnectionResourceRef {
  kind: CanvasConnectionResourceKind;
  name: string;
  namespace: string;
}

export interface CanvasDetectedConnection {
  kind: CanvasDetectedConnectionKind;
  source: CanvasConnectionResourceRef;
  target: CanvasConnectionResourceRef;
}

export interface DetectCanvasConnectionsOptions {
  apsData: K8sGetResponse | undefined;
  dbsData: K8sGetResponse | undefined;
  entryPointsData: K8sGetResponse | undefined;
  namespaceFallback?: string;
}

export interface DetectedCanvasConnectionEdgesOptions
  extends DetectCanvasConnectionsOptions {
  nodes: Node[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function metadataRecord(
  resource: unknown
): Record<string, unknown> | undefined {
  return asRecord(asRecord(resource)?.metadata);
}

function metadataName(resource: unknown): string | undefined {
  return nonEmptyString(metadataRecord(resource)?.name);
}

function metadataNamespace(
  resource: unknown,
  fallback: string | undefined
): string | undefined {
  return (
    nonEmptyString(metadataRecord(resource)?.namespace) ??
    nonEmptyString(fallback)
  );
}

function resourceKey(ref: CanvasConnectionResourceRef): string {
  return `${ref.kind}:${ref.namespace}:${ref.name}`;
}

function connectionKey(connection: CanvasDetectedConnection): string {
  return `${resourceKey(connection.source)}->${resourceKey(connection.target)}`;
}

function resourceRef(
  kind: CanvasConnectionResourceKind,
  name: string | undefined,
  namespace: string | undefined
): CanvasConnectionResourceRef | undefined {
  if (name === undefined || namespace === undefined) {
    return undefined;
  }
  return { kind, name, namespace };
}

function resourceRefFromRecord(
  kind: CanvasConnectionResourceKind,
  source: Record<string, unknown> | undefined
): CanvasConnectionResourceRef | undefined {
  return resourceRef(
    kind,
    nonEmptyString(source?.name),
    nonEmptyString(source?.namespace)
  );
}

function resourceRefFromMetadata(
  kind: CanvasConnectionResourceKind,
  resource: unknown,
  namespaceFallback: string | undefined
): CanvasConnectionResourceRef | undefined {
  return resourceRef(
    kind,
    metadataName(resource),
    metadataNamespace(resource, namespaceFallback)
  );
}

function nodeResourceRef(node: Node): CanvasConnectionResourceRef | undefined {
  const data = asRecord(node.data);

  switch (node.type) {
    case CANVAS_CONTAINER_NODE_TYPE:
      return resourceRefFromRecord("AP", asRecord(data?.states));
    case CANVAS_DATABASE_NODE_TYPE:
      return resourceRefFromRecord("DB", asRecord(data?.workload));
    case CANVAS_ENTRY_NODE_TYPE:
      return resourceRefFromRecord("EntryPoint", asRecord(data?.resource));
    default:
      return undefined;
  }
}

function specRecord(resource: unknown): Record<string, unknown> | undefined {
  return asRecord(asRecord(resource)?.spec);
}

function connectionSecretName(db: unknown): string | undefined {
  return nonEmptyString(specRecord(db)?.connectionSecretName);
}

function entryPointApRef(entryPoint: unknown): string | undefined {
  return nonEmptyString(specRecord(entryPoint)?.apRef);
}

function namespaceSecretKey(namespace: string, secretName: string): string {
  return `${namespace}:${secretName}`;
}

function secretRefsFromAp(ap: unknown): string[] {
  const env = specRecord(ap)?.env;
  if (!Array.isArray(env)) {
    return [];
  }
  const refs: string[] = [];
  for (const item of env) {
    const envItem = asRecord(item);
    const valueFrom = asRecord(envItem?.valueFrom);
    const secretKeyRef = asRecord(valueFrom?.secretKeyRef);
    const name = nonEmptyString(secretKeyRef?.name);
    if (name !== undefined) {
      refs.push(name);
    }
  }
  return refs;
}

function addUniqueConnection(
  connections: CanvasDetectedConnection[],
  seenConnectionKeys: Set<string>,
  connection: CanvasDetectedConnection
): void {
  const key = connectionKey(connection);
  if (seenConnectionKeys.has(key)) {
    return;
  }
  seenConnectionKeys.add(key);
  connections.push(connection);
}

export function detectCanvasConnections({
  apsData,
  dbsData,
  entryPointsData,
  namespaceFallback,
}: DetectCanvasConnectionsOptions): CanvasDetectedConnection[] {
  const aps = apItemsFromList(apsData);
  const dbs = apItemsFromList(dbsData);
  const entryPoints = apItemsFromList(entryPointsData);
  const apRefs = new Set<string>();
  for (const ap of aps) {
    const ref = resourceRefFromMetadata("AP", ap, namespaceFallback);
    if (ref !== undefined) {
      apRefs.add(resourceKey(ref));
    }
  }

  const connections: CanvasDetectedConnection[] = [];
  const seenConnectionKeys = new Set<string>();
  for (const entryPoint of entryPoints) {
    const namespace = metadataNamespace(entryPoint, namespaceFallback);
    const source = resourceRefFromMetadata(
      "EntryPoint",
      entryPoint,
      namespaceFallback
    );
    const apRef = entryPointApRef(entryPoint);
    const target = resourceRef("AP", apRef, namespace);
    if (
      source !== undefined &&
      target !== undefined &&
      apRefs.has(resourceKey(target))
    ) {
      addUniqueConnection(connections, seenConnectionKeys, {
        kind: "EntryPointToAP",
        source,
        target,
      });
    }
  }

  const dbRefBySecret = new Map<string, CanvasConnectionResourceRef>();
  for (const db of dbs) {
    const ref = resourceRefFromMetadata("DB", db, namespaceFallback);
    const secretName = connectionSecretName(db);
    if (ref !== undefined && secretName !== undefined) {
      dbRefBySecret.set(namespaceSecretKey(ref.namespace, secretName), ref);
    }
  }

  for (const ap of aps) {
    const source = resourceRefFromMetadata("AP", ap, namespaceFallback);
    if (source === undefined) {
      continue;
    }
    for (const secretName of secretRefsFromAp(ap)) {
      const target = dbRefBySecret.get(
        namespaceSecretKey(source.namespace, secretName)
      );
      if (target !== undefined) {
        addUniqueConnection(connections, seenConnectionKeys, {
          kind: "APToDB",
          source,
          target,
        });
      }
    }
  }

  return connections;
}

export function canvasConnectionEdgesFromDetectedConnections(
  connections: readonly CanvasDetectedConnection[],
  nodes: readonly Node[]
): Edge[] {
  const nodeIdByResourceKey = new Map<string, string>();
  for (const node of nodes) {
    const ref = nodeResourceRef(node);
    if (ref !== undefined) {
      nodeIdByResourceKey.set(resourceKey(ref), node.id);
    }
  }

  const edges: Edge[] = [];
  const seenEdgeIds = new Set<string>();
  for (const connection of connections) {
    const sourceKey = resourceKey(connection.source);
    const targetKey = resourceKey(connection.target);
    const source = nodeIdByResourceKey.get(sourceKey);
    const target = nodeIdByResourceKey.get(targetKey);
    if (source === undefined || target === undefined) {
      continue;
    }
    const id = `detected:${sourceKey}->${targetKey}`;
    if (seenEdgeIds.has(id)) {
      continue;
    }
    seenEdgeIds.add(id);
    edges.push({
      id,
      source,
      target,
    });
  }
  return edges;
}

export function detectedCanvasConnectionEdges({
  nodes,
  ...options
}: DetectedCanvasConnectionEdgesOptions): Edge[] {
  return canvasConnectionEdgesFromDetectedConnections(
    detectCanvasConnections(options),
    nodes
  );
}
