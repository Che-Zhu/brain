"use client";

import { EntryNodeBounds } from "./entry-node.bounds";
import { EntryNodeDefaultCard } from "./entry-node.card";
import { EntryNodeConnectionLayer } from "./entry-node.connection-layer";
import { EntryNodeDragStateFrame } from "./entry-node.drag-frame";
import { EntryNodeExpandButton } from "./entry-node.expand-button";

export function EntryNodeDefaultView() {
  return (
    <EntryNodeBounds>
      <EntryNodeConnectionLayer />
      <EntryNodeDragStateFrame>
        <EntryNodeDefaultCard />
      </EntryNodeDragStateFrame>
      <EntryNodeExpandButton />
    </EntryNodeBounds>
  );
}
