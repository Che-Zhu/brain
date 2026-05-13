"use client";

import {
  type PortRow,
  PortsTable,
} from "@workspace/ui/components/ports-table/ports-table";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { useMemo, useState } from "react";

const DEMO_ROWS = [
  {
    number: 8080,
    privateAddress: "10.244.2.41:8080",
    publicAddress: "svc.example.com:443",
  },
  {
    number: 8443,
    privateAddress: "10.244.2.41:8443",
    publicAddress: "tcp://lb.internal:8443",
  },
] satisfies PortRow[];

const ADDR_PORT_SUFFIX_RE = /:\d+$/;

function withSyncedAddresses(row: PortRow, nextNumber: number): PortRow {
  let publicAddress = row.publicAddress;
  if (publicAddress !== "—" && ADDR_PORT_SUFFIX_RE.test(publicAddress)) {
    publicAddress = publicAddress.replace(
      ADDR_PORT_SUFFIX_RE,
      `:${nextNumber}`
    );
  }
  return {
    number: nextNumber,
    privateAddress: row.privateAddress.replace(
      ADDR_PORT_SUFFIX_RE,
      `:${nextNumber}`
    ),
    publicAddress,
  };
}

export default function PortsTablePreview() {
  const [ports, setPorts] = useState(DEMO_ROWS);

  const handlers = useMemo(
    () => ({
      onAdd: (portNumber: number) =>
        setPorts((prev) => [
          ...prev,
          {
            number: portNumber,
            privateAddress: `10.244.2.41:${portNumber}`,
            publicAddress: "—",
          },
        ]),
      onDelete: (portNumber: number) =>
        setPorts((prev) => prev.filter((row) => row.number !== portNumber)),
      onUpdate: (previousPortNumber: number, nextPortNumber: number) =>
        setPorts((prev) =>
          prev.map((row) =>
            row.number === previousPortNumber
              ? withSyncedAddresses(row, nextPortNumber)
              : row
          )
        ),
    }),
    []
  );

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview containerClassName="max-w-2xl" showMaximize title="Ports table">
        <PortsTable.Variant0 ports={ports} {...handlers} />
      </Preview>
    </PreviewWrapper>
  );
}
