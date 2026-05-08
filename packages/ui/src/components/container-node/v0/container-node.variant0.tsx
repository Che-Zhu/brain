"use client";

import { Cpu, MemoryStick } from "lucide-react";
import type { ComponentProps } from "react";

import { useContainerNode } from "./container-node.context";
import { ContainerNodeHeaderMenu } from "./container-node.header-menu";
import {
  ContainerNodeContent,
  ContainerNodeFooter,
  ContainerNodeHeader,
  ContainerNodeResourceGroup,
  ContainerNodeShell,
} from "./container-node.layout";
import {
  ContainerNodeIconPlaceholder,
  ContainerNodeImage,
  ContainerNodeKind,
  ContainerNodeReplicas,
  ContainerNodeResource,
  ContainerNodeStatus,
  ContainerNodeTitle,
} from "./container-node.primitives";

/** First composed layout: shell + header / image / footer using primitives + context. */
export function ContainerNodeVariant0({
  className,
}: ComponentProps<typeof ContainerNodeShell>) {
  const { states } = useContainerNode();

  return (
    <ContainerNodeShell className={className}>
      <ContainerNodeHeader>
        <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2">
          <ContainerNodeIconPlaceholder />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ContainerNodeTitle />
            <ContainerNodeKind />
          </div>
        </div>
        <ContainerNodeHeaderMenu />
      </ContainerNodeHeader>
      <ContainerNodeContent>
        <ContainerNodeImage />
      </ContainerNodeContent>
      <ContainerNodeFooter>
        <ContainerNodeStatus />
        <ContainerNodeResourceGroup>
          <ContainerNodeResource icon={Cpu} percent={states.cpuPercent} />
          <ContainerNodeResource
            icon={MemoryStick}
            percent={states.memoryPercent}
          />
          <ContainerNodeReplicas />
        </ContainerNodeResourceGroup>
      </ContainerNodeFooter>
    </ContainerNodeShell>
  );
}
