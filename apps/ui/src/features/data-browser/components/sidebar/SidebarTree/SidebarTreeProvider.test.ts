import assert from "node:assert/strict";
import { test } from "node:test";

import type { AccessObject } from "@data-browser/api/access-types";
import {
  dataBrowserExpandedStorageKey,
  dataBrowserObjectNodeId,
  dataBrowserObjectToTreeNode,
  dataBrowserPostgresSchemaFolders,
  dataBrowserRedisKeysFolder,
} from "./SidebarTreeProvider";
import type { TreeNodeData } from "./types";

const connectionId = "data-browser-runtime";

function object(
  kind: string,
  path: string[],
  name = path.at(-1) ?? kind
): AccessObject {
  return {
    hasChildren: true,
    kind,
    name,
    ref: { kind, path },
  };
}

test("tree maps access object refs to legacy node types", () => {
  const cases = [
    [object("database", ["app"]), "database"],
    [object("schema", ["app", "public"]), "schema"],
    [object("table", ["app", "public", "users"]), "table"],
    [object("view", ["app", "public", "active_users"]), "view"],
    [object("collection", ["app", "events"]), "collection"],
    [object("key", ["app", "session:1"]), "redis_key"],
  ] as const;

  for (const [accessObject, type] of cases) {
    const node = dataBrowserObjectToTreeNode({
      connectionId,
      object: accessObject,
      parentId: "parent",
    });

    assert.equal(node?.type, type);
    assert.deepEqual(node?.metadata.objectRef, accessObject.ref);
    assert.equal(
      node?.id,
      dataBrowserObjectNodeId(connectionId, accessObject.ref)
    );
  }
});

test("postgres schema children are Tables and Views virtual folders", () => {
  const schemaRef = { kind: "schema", path: ["app", "public"] };
  const schemaNode: TreeNodeData = {
    connectionId,
    id: "schema-node",
    metadata: {
      database: "app",
      objectRef: schemaRef,
      schema: "public",
    },
    name: "public",
    parentId: "db-node",
    type: "schema",
  };

  const folders = dataBrowserPostgresSchemaFolders(schemaNode, (key) => key);

  assert.deepEqual(
    folders.map((folder) => folder.type),
    ["table_folder", "view_folder"]
  );
  assert.deepEqual(
    folders.map((folder) => folder.metadata.kindFilter),
    [["table"], ["view"]]
  );
  assert.deepEqual(
    folders.map((folder) => folder.metadata.parentRef),
    [schemaRef, schemaRef]
  );
});

test("redis database child is Keys virtual folder", () => {
  const databaseRef = { kind: "database", path: ["redis"] };
  const databaseNode: TreeNodeData = {
    connectionId,
    id: "redis-db",
    metadata: {
      database: "redis",
      objectRef: databaseRef,
    },
    name: "redis",
    type: "database",
  };

  const folders = dataBrowserRedisKeysFolder(databaseNode, (key) => key);

  assert.equal(folders.length, 1);
  assert.equal(folders[0]?.type, "redis_keys_folder");
  assert.deepEqual(folders[0]?.metadata.kindFilter, ["key"]);
  assert.deepEqual(folders[0]?.metadata.parentRef, databaseRef);
});

test("expanded tree localStorage key is scoped by project and service", () => {
  assert.equal(
    dataBrowserExpandedStorageKey({
      runtime: {
        database: { displayEngine: "PostgreSQL", name: "app" },
        databaseWorkloadName: "postgres-main",
        databaseWorkloadNamespace: "database-system",
        engine: "POSTGRES",
        kubeconfig: "kube",
        namespace: "project-ns",
        projectUid: "project-uid",
      },
    }),
    "data-browser:expanded:project-uid:database-system:postgres-main"
  );
});
