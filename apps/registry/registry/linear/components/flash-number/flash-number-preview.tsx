"use client";

import { Button } from "@workspace/ui/components/button";
import { FlashNumber } from "@workspace/ui/components/flash-number/flash-number";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import type { LucideIcon } from "lucide-react";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useEffect, useState } from "react";

/** Nine steps each; consecutive duplicates mean no value change → no flash on that tick. */
const SEQUENCE_CPU = [23, 23, 40, 55, 55, 55, 70, 70, 88] as const;
const SEQUENCE_MEMORY = [30, 45, 45, 60, 60, 75, 75, 75, 92] as const;
const SEQUENCE_DISK = [10, 25, 25, 25, 50, 65, 65, 80, 95] as const;

function ResourceUsageRow({
  icon,
  label,
  value,
  onDec,
  onInc,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <FlashNumber
        className="text-xs"
        icon={icon}
        maxDecimals={1}
        value={value}
      />
      <div className="flex shrink-0 gap-1">
        <Button
          aria-label={`Decrease ${label}`}
          onClick={onDec}
          size="icon-xs"
          type="button"
          variant="outline"
        >
          −
        </Button>
        <Button
          aria-label={`Increase ${label}`}
          onClick={onInc}
          size="icon-xs"
          type="button"
          variant="outline"
        >
          +
        </Button>
      </div>
    </div>
  );
}

function SequenceResourceRow({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">
        {label}
      </span>
      <FlashNumber
        className="text-xs"
        icon={icon}
        maxDecimals={1}
        value={value}
      />
    </div>
  );
}

function SequenceDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % 9);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  const cpu = SEQUENCE_CPU[step];
  const memory = SEQUENCE_MEMORY[step];
  const disk = SEQUENCE_DISK[step];

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2">
        <SequenceResourceRow icon={Cpu} label="CPU" value={cpu} />
        <SequenceResourceRow icon={MemoryStick} label="Memory" value={memory} />
        <SequenceResourceRow icon={HardDrive} label="Disk" value={disk} />
      </div>
      <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">
        <p className="mb-1.5">Step {step + 1}/9</p>
        <p>
          CPU{" "}
          <span className="text-foreground">[{SEQUENCE_CPU.join(", ")}]</span>
        </p>
        <p>
          Mem{" "}
          <span className="text-foreground">
            [{SEQUENCE_MEMORY.join(", ")}]
          </span>
        </p>
        <p>
          Disk{" "}
          <span className="text-foreground">[{SEQUENCE_DISK.join(", ")}]</span>
        </p>
      </div>
    </div>
  );
}

export default function FlashNumberPreview() {
  const [cpu, setCpu] = useState(23);
  const [memory, setMemory] = useState(62);
  const [disk, setDisk] = useState(41);

  const clamp = (n: number) =>
    Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview title="Flash number (resource %)">
        <div className="flex w-full max-w-md flex-col gap-3">
          <ResourceUsageRow
            icon={Cpu}
            label="CPU"
            onDec={() => setCpu((v) => clamp(v - 5))}
            onInc={() => setCpu((v) => clamp(v + 5))}
            value={cpu}
          />
          <ResourceUsageRow
            icon={MemoryStick}
            label="Memory"
            onDec={() => setMemory((v) => clamp(v - 5))}
            onInc={() => setMemory((v) => clamp(v + 5))}
            value={memory}
          />
          <ResourceUsageRow
            icon={HardDrive}
            label="Disk"
            onDec={() => setDisk((v) => clamp(v - 5))}
            onInc={() => setDisk((v) => clamp(v + 5))}
            value={disk}
          />
        </div>
      </Preview>

      <Preview title="Sequence (2s, 9 steps each)">
        <SequenceDemo />
      </Preview>
    </PreviewWrapper>
  );
}
