import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import {
  type ContainerEnvDbDsnSource,
  containerEnvDbDsnReferenceFromValue,
  containerEnvDbSecretReferenceFromValueFrom,
} from "@workspace/ui/lib/container-env-rows";
import type { Edge, Node } from "@xyflow/react";

import { dbDsnReferenceSourceFromDb } from "../k8s/db-dsn-reference-sources";
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

export function canvasConnectionResourceKey(
  ref: CanvasConnectionResourceRef
): string {
  return `${ref.kind}:${ref.namespace}:${ref.name}`;
}

function connectionKey(connection: CanvasDetectedConnection): string {
  const sourceKey = canvasConnectionResourceKey(connection.source);
  const targetKey = canvasConnectionResourceKey(connection.target);
  return `${sourceKey}->${targetKey}`;
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

export function canvasConnectionNodeResourceRef(
  node: Node
): CanvasConnectionResourceRef | undefined {
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

function entryPointApRef(entryPoint: unknown): string | undefined {
  return nonEmptyString(specRecord(entryPoint)?.apRef);
}

function envItemsFromAp(ap: unknown): unknown[] {
  const spec = specRecord(ap);
  const input = asRecord(spec?.input);
  if (Array.isArray(input?.env)) {
    return input.env;
  }
  const env = spec?.env;
  return Array.isArray(env) ? env : [];
}

function valueFromRefsFromAp(ap: unknown): unknown[] {
  const refs: unknown[] = [];
  for (const item of envItemsFromAp(ap)) {
    const envItem = asRecord(item);
    if (envItem?.valueFrom !== undefined) {
      refs.push(envItem.valueFrom);
    }
  }
  return refs;
}

function envValuesFromAp(ap: unknown): string[] {
  const values: string[] = [];
  for (const item of envItemsFromAp(ap)) {
    const envItem = asRecord(item);
    if (typeof envItem?.value === "string") {
      values.push(envItem.value);
    }
  }
  return values;
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

function apResourceKeySet(
  aps: readonly unknown[],
  namespaceFallback: string | undefined
): Set<string> {
  const refs = new Set<string>();
  for (const ap of aps) {
    const ref = resourceRefFromMetadata("AP", ap, namespaceFallback);
    if (ref !== undefined) {
      refs.add(canvasConnectionResourceKey(ref));
    }
  }
  return refs;
}

function addEntryPointConnections(
  connections: CanvasDetectedConnection[],
  seenConnectionKeys: Set<string>,
  entryPoints: readonly unknown[],
  apRefs: ReadonlySet<string>,
  namespaceFallback: string | undefined
): void {
  for (const entryPoint of entryPoints) {
    const namespace = metadataNamespace(entryPoint, namespaceFallback);
    const source = resourceRefFromMetadata(
      "EntryPoint",
      entryPoint,
      namespaceFallback
    );
    const target = resourceRef("AP", entryPointApRef(entryPoint), namespace);
    if (
      source === undefined ||
      target === undefined ||
      !apRefs.has(canvasConnectionResourceKey(target))
    ) {
      continue;
    }
    addUniqueConnection(connections, seenConnectionKeys, {
      kind: "EntryPointToAP",
      source,
      target,
    });
  }
}

function dbDsnReferenceSourcesFromDbs(
  dbs: readonly unknown[],
  namespaceFallback: string | undefined
): ContainerEnvDbDsnSource[] {
  const dbDsnSources: ContainerEnvDbDsnSource[] = [];
  for (const db of dbs) {
    const dsnSource = dbDsnReferenceSourceFromDb(db, namespaceFallback);
    if (dsnSource !== undefined) {
      dbDsnSources.push(dsnSource);
    }
  }
  return dbDsnSources;
}

function addSecretBackedApDbConnections(
  connections: CanvasDetectedConnection[],
  seenConnectionKeys: Set<string>,
  source: CanvasConnectionResourceRef,
  dbDsnSources: readonly ContainerEnvDbDsnSource[],
  ap: unknown
): void {
  for (const valueFrom of valueFromRefsFromAp(ap)) {
    const reference = containerEnvDbSecretReferenceFromValueFrom(
      valueFrom,
      dbDsnSources
    );
    const target = resourceRef(
      "DB",
      reference?.dbDsn?.dbName,
      reference?.dbDsn?.dbNamespace
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

function addDsnBackedApDbConnections(
  connections: CanvasDetectedConnection[],
  seenConnectionKeys: Set<string>,
  source: CanvasConnectionResourceRef,
  dbDsnSources: readonly ContainerEnvDbDsnSource[],
  ap: unknown
): void {
  for (const envValue of envValuesFromAp(ap)) {
    const reference = containerEnvDbDsnReferenceFromValue(
      envValue,
      dbDsnSources
    );
    const target = resourceRef(
      "DB",
      reference?.dbDsn?.dbName,
      reference?.dbDsn?.dbNamespace
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

function addApDbConnections(
  connections: CanvasDetectedConnection[],
  seenConnectionKeys: Set<string>,
  aps: readonly unknown[],
  dbDsnSources: readonly ContainerEnvDbDsnSource[],
  namespaceFallback: string | undefined
): void {
  for (const ap of aps) {
    const source = resourceRefFromMetadata("AP", ap, namespaceFallback);
    if (source === undefined) {
      continue;
    }
    addSecretBackedApDbConnections(
      connections,
      seenConnectionKeys,
      source,
      dbDsnSources,
      ap
    );
    addDsnBackedApDbConnections(
      connections,
      seenConnectionKeys,
      source,
      dbDsnSources,
      ap
    );
  }
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
  const connections: CanvasDetectedConnection[] = [];
  const seenConnectionKeys = new Set<string>();
  addEntryPointConnections(
    connections,
    seenConnectionKeys,
    entryPoints,
    apResourceKeySet(aps, namespaceFallback),
    namespaceFallback
  );
  addApDbConnections(
    connections,
    seenConnectionKeys,
    aps,
    dbDsnReferenceSourcesFromDbs(dbs, namespaceFallback),
    namespaceFallback
  );

  return connections;
}

export function canvasConnectionEdgesFromDetectedConnections(
  connections: readonly CanvasDetectedConnection[],
  nodes: readonly Node[]
): Edge[] {
  const nodeIdByResourceKey = new Map<string, string>();
  for (const node of nodes) {
    const ref = canvasConnectionNodeResourceRef(node);
    if (ref !== undefined) {
      nodeIdByResourceKey.set(canvasConnectionResourceKey(ref), node.id);
    }
  }

  const edges: Edge[] = [];
  const seenEdgeIds = new Set<string>();
  for (const connection of connections) {
    const sourceKey = canvasConnectionResourceKey(connection.source);
    const targetKey = canvasConnectionResourceKey(connection.target);
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
