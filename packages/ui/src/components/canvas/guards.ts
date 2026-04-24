import type { CanvasNode } from "./types";

export function isContainerNode(node: CanvasNode) {
  return node.type === "container";
}

export function isDatabaseNode(node: CanvasNode) {
  return node.type === "database";
}

export function isDevEnvNode(node: CanvasNode) {
  return node.type === "devEnv";
}

export function isEntryNode(node: CanvasNode) {
  return node.type === "entry";
}

export function isGhostNode(node: CanvasNode) {
  return node.isGhost === true;
}
