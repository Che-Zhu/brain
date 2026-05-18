/** One ConfigMap-derived row for AP config backup / orphaned snapshot UX. */
export interface ContainerHistorySnapshotRow {
  /** Kubernetes ConfigMap name (`{ap}-config-snapshot-{hash}` in the product list). */
  configMapName: string;
  /** Embedded `config.yaml` body when already available (preview / inlined data). */
  configYaml?: string;
  /** `metadata.creationTimestamp` (RFC3339) from the snapshot ConfigMap. */
  createdAt: string;
  /** Image from embedded `config.yaml` (API summary); may be empty. */
  image: string;
  /** `active` when this orphan’s hash matches `status.configVersionHash`; otherwise `orphan`. */
  variant: "active" | "orphan";
  /** Snapshot hash (ConfigMap name suffix; matches `status.configVersionHash` when active). */
  versionHash?: string;
}
