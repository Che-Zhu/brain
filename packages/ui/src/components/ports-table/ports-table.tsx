"use client";

import {
  PortsTableActions as PortsTableActionsLeaf,
  PortsTableNewButton as PortsTableNewButtonLeaf,
  PortsTableRow as PortsTableRowLeaf,
} from "./ports-table.parts";
import { PortsTableRoot as PortsTableRootLeaf } from "./ports-table.root";
import { PortsTableVariant0 as PortsTableVariant0Leaf } from "./ports-table.variant0";

export { usePortsTableContext } from "./ports-table.context";
export {
  PortsTableActions,
  PortsTableNewButton,
  PortsTableRow,
} from "./ports-table.parts";
export { PortsTableRoot } from "./ports-table.root";
export type {
  PortRow,
  PortsTableCallbacks,
  PortsTableContextValue,
  PortsTableRootProps,
} from "./ports-table.types";
export { PortsTableVariant0 } from "./ports-table.variant0";
export const PortsTable = {
  Root: PortsTableRootLeaf,
  Row: PortsTableRowLeaf,
  Actions: PortsTableActionsLeaf,
  NewButton: PortsTableNewButtonLeaf,
  Variant0: PortsTableVariant0Leaf,
};
