import type * as React from "react";

/** Display row; addressing is owned by the host — callbacks only carry port numbers. */
export interface PortRow {
  number: number;
  privateAddress: string;
  publicAddress: string;
}

/** Mutations are keyed by port number only. */
export interface PortsTableCallbacks {
  onAdd?: (portNumber: number) => void;
  onDelete?: (portNumber: number) => void;
  onUpdate?: (previousPortNumber: number, nextPortNumber: number) => void;
}

export interface PortsTableContextValue extends PortsTableCallbacks {
  openAddDialog: () => void;
  requestDelete: (portNumber: number) => void;
  requestUpdate: (portNumber: number) => void;
}

export type PortsTableRootProps = PortsTableCallbacks &
  Omit<React.ComponentProps<"div">, "children"> & {
    ports: PortRow[];
    children?: React.ReactNode;
  };
