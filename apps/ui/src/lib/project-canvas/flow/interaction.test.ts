import assert from "node:assert/strict";
import { test } from "node:test";

import type { Connection } from "@xyflow/react";

import { projectCanvasInteractionProps } from "./interaction";

test("editable project canvas emits Connecting Edge callbacks", () => {
  const calls: Connection[] = [];
  const props = projectCanvasInteractionProps({
    onConnect: (connection) => calls.push(connection),
    readOnly: false,
  });
  const connection = {
    source: "ap-api",
    sourceHandle: "right",
    target: "db-postgres",
    targetHandle: "left",
  } satisfies Connection;

  assert.equal(props.nodesConnectable, true);
  props.onConnect?.(connection);
  assert.deepEqual(calls, [connection]);
});

test("read-only project canvas disables Connecting Edge callbacks", () => {
  const calls: Connection[] = [];
  const props = projectCanvasInteractionProps({
    onConnect: (connection) => calls.push(connection),
    readOnly: true,
  });

  props.onConnect?.({
    source: "ap-api",
    sourceHandle: "right",
    target: "db-postgres",
    targetHandle: "left",
  });

  assert.equal(props.nodesConnectable, false);
  assert.deepEqual(calls, []);
});
