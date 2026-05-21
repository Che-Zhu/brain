import assert from "node:assert/strict";
import { test } from "node:test";

import type { Node } from "@xyflow/react";

import {
  initialCanvasViewportFollowState,
  resolveCanvasViewportFollow,
} from "./canvas.viewport-follow";

function node(id: string, follow = true): Node {
  return {
    data: { follow },
    id,
    position: { x: 0, y: 0 },
  };
}

const isFollowTarget = (candidate: Node) => candidate.data.follow === true;

test("does not follow nodes from the first detect in a scope", () => {
  const result = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api")],
    state: initialCanvasViewportFollowState,
  });

  assert.deepEqual(result.action, { kind: "none" });
  assert.equal(result.state.initialized, true);
  assert.equal(result.state.knownNodeIds.has("ap-api"), true);
});

test("centers a single previously unseen follow target after the first detect", () => {
  const first = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api")],
    state: initialCanvasViewportFollowState,
  });

  const result = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api"), node("db-postgres")],
    state: first.state,
  });

  assert.deepEqual(result.action, { kind: "setCenter", nodeId: "db-postgres" });
});

test("fits the view to only the newly seen follow targets when several arrive together", () => {
  const first = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api")],
    state: initialCanvasViewportFollowState,
  });

  const result = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api"), node("db-a"), node("db-b"), node("saved", false)],
    state: first.state,
  });

  assert.deepEqual(result.action, {
    kind: "fitView",
    nodeIds: ["db-a", "db-b"],
  });
});

test("does not follow known nodes whose position or data changed", () => {
  const first = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api")],
    state: initialCanvasViewportFollowState,
  });

  const result = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [{ ...node("ap-api"), position: { x: 100, y: 200 } }],
    state: first.state,
  });

  assert.deepEqual(result.action, { kind: "none" });
});

test("treats the first detect after a scope key change as opening state", () => {
  const first = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-a",
    nodes: [node("ap-api")],
    state: initialCanvasViewportFollowState,
  });

  const result = resolveCanvasViewportFollow({
    isFollowTarget,
    key: "project-b",
    nodes: [node("db-postgres")],
    state: first.state,
  });

  assert.deepEqual(result.action, { kind: "none" });
  assert.equal(result.state.knownNodeIds.has("db-postgres"), true);
});
