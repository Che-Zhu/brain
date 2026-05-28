/** Supported Redis key types in the Phase 4 create/edit flows. */
export type RedisKeyType = "string" | "hash" | "list" | "set" | "zset";

/** Editable hash entry in the Redis key draft state. */
export interface RedisHashPairDraft {
  field: string;
  value: string;
}

/** Editable list/set item in the Redis key draft state. */
export interface RedisListItemDraft {
  value: string;
}

/** Editable sorted-set member in the Redis key draft state. */
export interface RedisZSetItemDraft {
  member: string;
  score: string;
}

/** Normalized draft state shared by Redis create and edit flows. */
export interface RedisKeyDraft {
  hashPairs: RedisHashPairDraft[];
  key: string;
  listItems: RedisListItemDraft[];
  mode: "create" | "edit";
  setItems: RedisListItemDraft[];
  stringValue: string;
  type: RedisKeyType;
  zsetItems: RedisZSetItemDraft[];
}
