import type { ContainerHistorySnapshotRow } from "@workspace/ui/components/container-history-pane/container-history-pane.types";
import { sortSnapshotRowsByCreatedAtDesc } from "@workspace/ui/components/container-history-pane/sort-snapshot-rows";

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

/** Synthetic `data.config.yaml` for registry previews (effective AP spec shape). */
export function mockEffectiveSpecYamlSnippet(
  workloadName: string,
  options: {
    image: string;
    namespace?: string;
    replicas?: number;
    restartRequest?: number;
  }
): string {
  const ns = options.namespace ?? "demo-namespace";
  const replicas = options.replicas ?? 1;
  const restartRequest = options.restartRequest ?? 0;
  const image =
    options.image.trim() === ""
      ? "registry.example.io/demo:latest"
      : options.image;

  return [
    "# Effective AP spec snapshot (embedded in ConfigMap key config.yaml)",
    'cpuLimit: "2000m"',
    'cpuRequest: "200m"',
    "endpoints: []",
    `image: ${JSON.stringify(image)}`,
    'imagePullPolicy: "Always"',
    "ingressAnnotations: {}",
    'memoryLimit: "2048Mi"',
    'memoryRequest: "204Mi"',
    `name: ${JSON.stringify(workloadName)}`,
    `namespace: ${JSON.stringify(ns)}`,
    "paused: false",
    'projectName: ""',
    `replicas: ${replicas}`,
    `restartRequest: ${restartRequest}`,
  ].join("\n");
}

/**
 * Mock orphan snapshots for registry previews (`status.backups` shape).
 * The first hash acts as “live” (`variant: active`) like `status.configVersionHash`.
 */
export function mockApConfigSnapshotRows(
  workloadName: string
): ContainerHistorySnapshotRow[] {
  /** Ten retained snapshot ConfigMaps (matches cleanup CronJob `KEEP=10`). */
  const snapshotHashes = [
    "deadbeefcafe",
    "9a8b7c6d5e4f",
    "badc0ffee0dd",
    "c0ffeef00dba",
    "f00dbabe1234",
    "aabbccddee01",
    "112233445566",
    "998877665544",
    "feedfacecafe",
    "0102030405ab",
  ] as const;

  const liveHash = snapshotHashes[0];

  const orphans: ContainerHistorySnapshotRow[] = snapshotHashes.map(
    (hash, index) => ({
      configMapName: `${workloadName}-config-snapshot-${hash}`,
      variant: hash === liveHash ? ("active" as const) : ("orphan" as const),
      versionHash: hash,
      image:
        index % 4 === 3
          ? ""
          : `registry.example.io/demo:v${Math.max(1, 10 - index)}`,
      createdAt: isoHoursAgo(6 * (index + 1)),
      configYaml: mockEffectiveSpecYamlSnippet(workloadName, {
        image:
          index % 4 === 3
            ? ""
            : `registry.example.io/demo:v${Math.max(1, 10 - index)}`,
        replicas: Math.max(1, 5 - (index % 3)),
        restartRequest: index,
      }),
    })
  );

  return sortSnapshotRowsByCreatedAtDesc(orphans);
}
