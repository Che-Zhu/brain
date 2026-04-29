"use client";

import { EntryNodeConnectionButton } from "./entry-node.connection-button";
import type { EntryNodeConnectionSide } from "./entry-node.types";

const CONNECTION_SIDES = [
  "top",
  "right",
  "bottom",
  "left",
] as const satisfies readonly EntryNodeConnectionSide[];

export function EntryNodeConnectionLayer() {
  return (
    <>
      {CONNECTION_SIDES.map((side) => (
        <EntryNodeConnectionButton key={side} side={side} />
      ))}
    </>
  );
}
