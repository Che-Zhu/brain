import assert from "node:assert/strict";
import { test } from "node:test";

import { projectCanvasInteractionProps } from "./interaction";

test("project canvas disables user-created connection interactions", () => {
  const props = projectCanvasInteractionProps({ readOnly: false });

  assert.equal(props.connectOnClick, false);
  assert.equal(props.edgesReconnectable, false);
  assert.equal(props.nodesConnectable, false);
  assert.equal(
    props.onConnect?.({
      source: "a",
      sourceHandle: null,
      target: "b",
      targetHandle: null,
    }),
    undefined
  );
});

test("project canvas still gates node dragging by read-only mode", () => {
  assert.equal(
    projectCanvasInteractionProps({ readOnly: false }).nodesDraggable,
    true
  );
  assert.equal(
    projectCanvasInteractionProps({ readOnly: true }).nodesDraggable,
    false
  );
});
