"use client";

import { PortsTableActions, PortsTableRow } from "./ports-table.parts";
import { PortsTableRoot } from "./ports-table.root";
import type { PortsTableRootProps } from "./ports-table.types";

export function PortsTableVariant0({
  ports,
  onUpdate,
  onDelete,
  onAdd,
  ...props
}: Omit<PortsTableRootProps, "children">) {
  return (
    <PortsTableRoot
      onAdd={onAdd}
      onDelete={onDelete}
      onUpdate={onUpdate}
      ports={ports}
      {...props}
    >
      {ports.map((port) => (
        <PortsTableRow key={port.number} port={port}>
          <PortsTableActions port={port} />
        </PortsTableRow>
      ))}
    </PortsTableRoot>
  );
}
