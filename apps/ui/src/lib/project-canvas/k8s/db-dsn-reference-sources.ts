import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import type { ContainerEnvDbDsnSource } from "@workspace/ui/lib/container-env-rows";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function dbDsnReferenceSourceFromDb(
  db: unknown,
  namespaceFallback?: string
): ContainerEnvDbDsnSource | undefined {
  const root = asRecord(db) ?? {};
  const metadata = asRecord(root.metadata) ?? {};
  const status = asRecord(root.status) ?? {};
  const name = nonEmptyString(metadata.name);
  const namespace = nonEmptyString(metadata.namespace) ?? namespaceFallback;
  if (name === undefined || namespace === undefined || namespace === "") {
    return undefined;
  }

  const source: ContainerEnvDbDsnSource = { name, namespace };
  const privateDsn = nonEmptyString(status.connectionStringPrivate);
  if (privateDsn !== undefined) {
    source.privateDsn = privateDsn;
  }
  const publicDsn = nonEmptyString(status.connectionStringPublic);
  if (publicDsn !== undefined) {
    source.publicDsn = publicDsn;
  }
  return source;
}

export function dbDsnReferenceSourcesFromDbsData(
  dbsData: K8sGetResponse | undefined,
  namespaceFallback?: string
): ContainerEnvDbDsnSource[] {
  return apItemsFromList(dbsData)
    .map((item) => dbDsnReferenceSourceFromDb(item, namespaceFallback))
    .filter(
      (source): source is ContainerEnvDbDsnSource => source !== undefined
    );
}
