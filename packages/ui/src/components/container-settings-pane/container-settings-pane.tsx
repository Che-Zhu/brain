"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
  PortsTable,
  type PortRow as PortsTableDisplayRow,
} from "@workspace/ui/components/ports-table/ports-table";
import { RawEditor } from "@workspace/ui/components/raw-editor";
import { ScaleSlider } from "@workspace/ui/components/scale-slider/scale-slider";
import { clampScale } from "@workspace/ui/components/scale-slider/scale-slider.utils";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  envToText,
  type ParsedEnvPair,
  parseEnvText,
} from "@workspace/ui/lib/parse-env-text";
import { cn } from "@workspace/ui/lib/utils";
import { Cpu, Layers, MemoryStick, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";

const CPU_QUOTA_DIRTY_EPS = 1e-9;

function resourceQuotasDirty(
  draftCpu: number,
  draftMem: number,
  committedCpu: number,
  committedMem: number,
  replicas?: { committed: number; draft: number }
): boolean {
  const cpuMemDirty =
    Math.abs(draftCpu - committedCpu) > CPU_QUOTA_DIRTY_EPS ||
    Math.round(draftMem) !== Math.round(committedMem);
  if (replicas == null) {
    return cpuMemDirty;
  }
  return (
    cpuMemDirty || Math.round(replicas.draft) !== Math.round(replicas.committed)
  );
}

/** True when re-serializing and parsing would keep the same ordered name/value rows. */
function envRoundTripsCleanly(entries: ContainerEnvVar[]): boolean {
  if (entries.length === 0) {
    return true;
  }
  const text = envToText(entries);
  const parsed = parseEnvText(text);
  if (parsed.length !== entries.length) {
    return false;
  }
  return entries.every(
    (e, i) =>
      parsed[i] != null &&
      parsed[i].name === e.name &&
      parsed[i].value === e.value
  );
}

/** Quota sliders are controlled: parent owns `value` and receives `onValueChange`. */
export interface ContainerSettingsControlledQuotaProps {
  disabled?: boolean;
  max?: number;
  min?: number;
  onValueChange: (value: number) => void;
  /** Radix Slider step (`ScaleSlider.Root` defaults to `0.1` unless set). */
  step?: number;
  value: number;
}

/** @deprecated Prefer {@link ContainerSettingsControlledQuotaProps}; pane quotas are always controlled. */
export type ContainerSettingsQuotaSliderProps =
  ContainerSettingsControlledQuotaProps;

export interface ContainerEnvVar {
  name: string;
  value: string;
}

export interface ContainerPort {
  /** Optional ingress or public host (Public address column when no explicit publicAddress URL). */
  host?: string;
  port: number;
  /**
   * Full internal URL (e.g. from AP `status.endpoints[].privateAddress`).
   * When set, overrides the default `0.0.0.0:{port}` in the Private address column.
   */
  privateAddress?: string;
  protocol: string;
  /**
   * Full public URL (e.g. from AP `status.endpoints[].publicAddress`).
   * When set, overrides host / protocol for the Public address column.
   */
  publicAddress?: string;
}

export interface ContainerSettingsPaneProps {
  className?: string;
  cpuQuota: ContainerSettingsControlledQuotaProps;
  /** Environment variables; shown as raw KEY=value preview. Edit via dialog. */
  env: ContainerEnvVar[];
  /** Full image reference (repository + tag/digest). */
  image: string;
  memoryQuota: ContainerSettingsControlledQuotaProps;
  onEnvChange: (env: ContainerEnvVar[]) => void;
  onImageChange: (image: string) => void;
  onPortsChange: (ports: ContainerPort[]) => void;
  /**
   * When set (and not `readOnly`), CPU/memory/replicas sliders keep local drafts until Save; Cancel reverts.
   * Omit for live slider updates via `cpuQuota` / `memoryQuota` / `replicasQuota` `onValueChange`.
   * When `replicasQuota` is set, `replicas` is included on Save.
   */
  onResourceQuotasCommit?: (next: {
    cpu: number;
    memory: number;
    replicas?: number;
  }) => void | Promise<void>;
  /** Exposed container ports + protocol labels. */
  ports: ContainerPort[];
  /**
   * When true, image/env/ports are view-only and quota sliders do not send updates.
   * Host may pass no-op callbacks.
   */
  readOnly?: boolean;
  /**
   * Deployment replica count (AP `spec.replicas`). Omit to hide the control (e.g. DB workloads).
   */
  replicasQuota?: ContainerSettingsControlledQuotaProps;
}

function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-medium text-foreground text-sm",
        className ?? "leading-snug"
      )}
    >
      {children}
    </h3>
  );
}

function containerPortsToTableRows(
  list: ContainerPort[]
): PortsTableDisplayRow[] {
  return list.map((entry) => {
    const publicAddressExplicit =
      entry.publicAddress != null && entry.publicAddress !== "";
    const privateAddressExplicit =
      entry.privateAddress != null && entry.privateAddress !== "";

    let publicAddress: string;
    if (publicAddressExplicit) {
      publicAddress = entry.publicAddress ?? "";
    } else if (entry.host != null && entry.host !== "") {
      publicAddress = entry.host;
    } else {
      publicAddress = entry.protocol.toUpperCase();
    }

    return {
      number: entry.port,
      privateAddress: privateAddressExplicit
        ? (entry.privateAddress ?? "")
        : `0.0.0.0:${entry.port}`,
      publicAddress,
    };
  });
}

/**
 * Structured readout for workload settings: container image, CPU/memory quota sliders,
 * optional replica count, environment variables, and exposed ports (`PortsTable`).
 * All fields are controlled by the host.
 */
export function ContainerSettingsPane({
  className,
  image,
  onImageChange,
  onEnvChange,
  onPortsChange,
  cpuQuota,
  memoryQuota,
  env,
  ports,
  replicasQuota,
  onResourceQuotasCommit,
  readOnly = false,
}: ContainerSettingsPaneProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDraft, setImageDraft] = useState(image);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [envEditorNonce, setEnvEditorNonce] = useState(0);
  const [quotaSavePending, setQuotaSavePending] = useState(false);
  const inputId = useId();

  const quotaCommitMode = onResourceQuotasCommit != null && readOnly !== true;

  const [draftCpu, setDraftCpu] = useState(cpuQuota.value);
  const [draftMem, setDraftMem] = useState(memoryQuota.value);
  const [draftReplicas, setDraftReplicas] = useState(
    () => replicasQuota?.value ?? 1
  );

  useEffect(() => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    if (replicasQuota == null) {
      return;
    }
    setDraftReplicas(replicasQuota.value);
  }, [cpuQuota.value, memoryQuota.value, replicasQuota]);

  const quotasDirty = resourceQuotasDirty(
    draftCpu,
    draftMem,
    cpuQuota.value,
    memoryQuota.value,
    replicasQuota == null
      ? undefined
      : { committed: replicasQuota.value, draft: draftReplicas }
  );

  const handleQuotaCancel = () => {
    setDraftCpu(cpuQuota.value);
    setDraftMem(memoryQuota.value);
    if (replicasQuota == null) {
      return;
    }
    setDraftReplicas(replicasQuota.value);
  };

  const handleQuotaSave = async () => {
    if (onResourceQuotasCommit == null) {
      return;
    }
    setQuotaSavePending(true);
    try {
      await onResourceQuotasCommit({
        cpu: draftCpu,
        memory: draftMem,
        ...(replicasQuota == null ? {} : { replicas: draftReplicas }),
      });
    } finally {
      setQuotaSavePending(false);
    }
  };

  const portsTableRows = useMemo(
    () => containerPortsToTableRows(ports),
    [ports]
  );

  const envPreviewInvalid = !envRoundTripsCleanly(env);
  const envPreviewText =
    env.length === 0
      ? "# No variables — open editor to add KEY=value lines."
      : envToText(env);

  const cpuSlider = useMemo(() => {
    const base = {
      min: 0.25,
      max: 16,
      step: 0.25,
      ...cpuQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftCpu,
        value: draftCpu,
      };
    }
    return base;
  }, [cpuQuota, draftCpu, quotaCommitMode, readOnly]);

  const memorySlider = useMemo(() => {
    const base = {
      min: 512,
      max: 8192,
      step: 128,
      ...memoryQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftMem,
        value: draftMem,
      };
    }
    return base;
  }, [draftMem, memoryQuota, quotaCommitMode, readOnly]);

  const replicasSlider = useMemo(() => {
    if (replicasQuota == null) {
      return null;
    }
    const base = {
      min: 1,
      max: 20,
      step: 1,
      ...replicasQuota,
      ...(readOnly ? { disabled: true } : {}),
    };
    if (quotaCommitMode) {
      return {
        ...base,
        onValueChange: setDraftReplicas,
        value: draftReplicas,
      };
    }
    return base;
  }, [draftReplicas, quotaCommitMode, readOnly, replicasQuota]);

  const replicasSliderParts = useMemo(() => {
    if (replicasSlider == null) {
      return null;
    }
    const {
      value: replicasValueRaw,
      onValueChange: onReplicasQuotaChange,
      ...rest
    } = replicasSlider;
    return {
      onReplicasQuotaChange,
      replicasValue: clampScale(
        replicasValueRaw,
        replicasSlider.min,
        replicasSlider.max
      ),
      rest,
    };
  }, [replicasSlider]);

  const {
    value: cpuValueRaw,
    onValueChange: onCpuQuotaChange,
    ...cpuSliderRest
  } = cpuSlider;
  const {
    value: memoryValueRaw,
    onValueChange: onMemoryQuotaChange,
    ...memorySliderRest
  } = memorySlider;

  const cpuDecimals = 2;
  const memoryDecimals = 0;
  const cpuValue = clampScale(cpuValueRaw, cpuSlider.min, cpuSlider.max);
  const memoryValue = clampScale(
    memoryValueRaw,
    memorySlider.min,
    memorySlider.max
  );

  const handleImageDialogChange = (open: boolean) => {
    setImageDialogOpen(open);
    if (open) {
      setImageDraft(image);
    }
  };

  const handleSaveImage = () => {
    onImageChange(imageDraft.trim());
    setImageDialogOpen(false);
  };

  const handleEnvDialogChange = (open: boolean) => {
    setEnvDialogOpen(open);
    if (open) {
      setEnvEditorNonce((n) => n + 1);
    }
  };

  const handleSaveEnvFromRaw = (parsed: ParsedEnvPair[]) => {
    onEnvChange(parsed.map((p) => ({ name: p.name, value: p.value })));
    setEnvDialogOpen(false);
    return Promise.resolve();
  };

  const portsTableMutationProps = {
    onAdd: (portNumber: number) =>
      onPortsChange([...ports, { port: portNumber, protocol: "tcp" }]),
    onDelete: (portNumber: number) =>
      onPortsChange(ports.filter((p) => p.port !== portNumber)),
    onUpdate: (previousPortNumber: number, nextPortNumber: number) =>
      onPortsChange(
        ports.map((p) =>
          p.port === previousPortNumber ? { ...p, port: nextPortNumber } : p
        )
      ),
  };

  return (
    <>
      <div
        className={cn(
          "flex w-full flex-col gap-5 text-muted-foreground",
          className
        )}
        data-slot="container-settings-pane"
      >
        <section className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SectionTitle>Image</SectionTitle>
          </div>
          {readOnly ? (
            <div
              className={cn(
                "flex min-w-0 items-start break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-foreground text-sm leading-snug"
              )}
            >
              {image}
            </div>
          ) : (
            <button
              aria-label="Edit container image"
              className={cn(
                "flex items-center justify-between gap-1.5 break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 text-left font-mono text-foreground text-sm leading-snug",
                "cursor-pointer transition-colors hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              )}
              onClick={() => handleImageDialogChange(true)}
              type="button"
            >
              {image}
              <SquarePen
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex h-6 min-w-0 items-center justify-between gap-2">
            <SectionTitle className="m-0 min-w-0 shrink leading-none">
              Resource quota
            </SectionTitle>
            {quotaCommitMode && quotasDirty ? (
              <div className="-mr-1 flex shrink-0 items-center gap-1">
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={quotaSavePending}
                  onClick={handleQuotaCancel}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={quotaSavePending}
                  onClick={async () => {
                    await handleQuotaSave();
                  }}
                  type="button"
                  variant="secondary"
                >
                  Save
                </Button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            <ScaleSlider.Root
              {...cpuSliderRest}
              maxDecimals={cpuDecimals}
              onValueChange={onCpuQuotaChange}
              value={cpuValue}
              valueDisplay="number"
            >
              <ScaleSlider.Stack className="w-full">
                <ScaleSlider.Header className="min-h-6">
                  <ScaleSlider.Group className="min-w-0 gap-2">
                    <ScaleSlider.Icon className="shrink-0" icon={Cpu} />
                    <ScaleSlider.Label className="text-foreground">
                      CPU (cores)
                    </ScaleSlider.Label>
                  </ScaleSlider.Group>
                  <div className="flex h-6 min-w-0 items-center justify-end">
                    <ScaleSlider.Value />
                  </div>
                </ScaleSlider.Header>
                <ScaleSlider.Control aria-label="CPU quota (cores)">
                  <ScaleSlider.Track>
                    <ScaleSlider.Range />
                  </ScaleSlider.Track>
                  <ScaleSlider.Thumb />
                </ScaleSlider.Control>
              </ScaleSlider.Stack>
            </ScaleSlider.Root>

            <ScaleSlider.Root
              {...memorySliderRest}
              maxDecimals={memoryDecimals}
              onValueChange={onMemoryQuotaChange}
              value={memoryValue}
              valueDisplay="number"
            >
              <ScaleSlider.Stack className="w-full">
                <ScaleSlider.Header className="min-h-6">
                  <ScaleSlider.Group className="min-w-0 gap-2">
                    <ScaleSlider.Icon className="shrink-0" icon={MemoryStick} />
                    <ScaleSlider.Label className="text-foreground">
                      Memory (MiB)
                    </ScaleSlider.Label>
                  </ScaleSlider.Group>
                  <div className="flex h-6 min-w-0 items-center justify-end">
                    <ScaleSlider.Value />
                  </div>
                </ScaleSlider.Header>
                <ScaleSlider.Control aria-label="Memory quota (MiB)">
                  <ScaleSlider.Track>
                    <ScaleSlider.Range />
                  </ScaleSlider.Track>
                  <ScaleSlider.Thumb />
                </ScaleSlider.Control>
              </ScaleSlider.Stack>
            </ScaleSlider.Root>

            {replicasSliderParts == null ? null : (
              <ScaleSlider.Root
                {...replicasSliderParts.rest}
                maxDecimals={0}
                onValueChange={replicasSliderParts.onReplicasQuotaChange}
                value={replicasSliderParts.replicasValue}
                valueDisplay="number"
              >
                <ScaleSlider.Stack className="w-full">
                  <ScaleSlider.Header className="min-h-6">
                    <ScaleSlider.Group className="min-w-0 gap-2">
                      <ScaleSlider.Icon className="shrink-0" icon={Layers} />
                      <ScaleSlider.Label className="text-foreground">
                        Replicas
                      </ScaleSlider.Label>
                    </ScaleSlider.Group>
                    <div className="flex h-6 min-w-0 items-center justify-end">
                      <ScaleSlider.Value />
                    </div>
                  </ScaleSlider.Header>
                  <ScaleSlider.Control aria-label="Replica count">
                    <ScaleSlider.Track>
                      <ScaleSlider.Range />
                    </ScaleSlider.Track>
                    <ScaleSlider.Thumb />
                  </ScaleSlider.Control>
                </ScaleSlider.Stack>
              </ScaleSlider.Root>
            )}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SectionTitle>Environment</SectionTitle>
          </div>
          {readOnly ? (
            <div
              aria-invalid={envPreviewInvalid}
              className={cn(
                "flex max-h-48 min-h-[120px] w-full items-start overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-foreground text-sm leading-snug",
                "aria-invalid:border-destructive/70"
              )}
            >
              <span className="min-w-0 flex-1">
                {env.length === 0 ? (
                  <span className="text-muted-foreground italic">
                    {envPreviewText}
                  </span>
                ) : (
                  envPreviewText
                )}
              </span>
            </div>
          ) : (
            <button
              aria-invalid={envPreviewInvalid}
              aria-label="Edit environment variables"
              className={cn(
                "flex max-h-48 min-h-[120px] w-full items-start justify-between gap-1.5 overflow-y-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/40 px-2.5 py-2 text-left font-mono text-foreground text-sm leading-snug",
                "cursor-pointer transition-colors hover:bg-muted/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                "aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/30"
              )}
              onClick={() => handleEnvDialogChange(true)}
              type="button"
            >
              <span className="min-w-0 flex-1">
                {env.length === 0 ? (
                  <span className="text-muted-foreground italic">
                    {envPreviewText}
                  </span>
                ) : (
                  envPreviewText
                )}
              </span>
              <SquarePen
                aria-hidden
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
            </button>
          )}
          {envPreviewInvalid && !readOnly ? (
            <p className="text-destructive text-xs" role="status">
              Some variables use names or lines that cannot be encoded as
              Kubernetes env (or would be dropped on save). Edit to fix
              KEY=value syntax.
            </p>
          ) : null}
        </section>

        <Separator />

        <section className="flex min-w-0 flex-col gap-2">
          <PortsTable.Variant0
            ports={portsTableRows}
            {...(readOnly
              ? {}
              : {
                  onAdd: portsTableMutationProps.onAdd,
                  onDelete: portsTableMutationProps.onDelete,
                  onUpdate: portsTableMutationProps.onUpdate,
                })}
          />
        </section>
      </div>

      {readOnly ? null : (
        <>
          <Dialog onOpenChange={handleImageDialogChange} open={imageDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Container image</DialogTitle>
                <DialogDescription>
                  Registry path, tag, or digest for this workload.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor={inputId}>Image reference</Label>
                <Textarea
                  className="min-h-24 font-mono text-sm"
                  id={inputId}
                  onChange={(e) => setImageDraft(e.target.value)}
                  placeholder="e.g. ghcr.io/org/app:1.0.0"
                  value={imageDraft}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => handleImageDialogChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveImage} type="button">
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog onOpenChange={handleEnvDialogChange} open={envDialogOpen}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>Environment variables</DialogTitle>
                <DialogDescription>
                  One KEY=value per line. Lines with invalid Kubernetes env
                  names are ignored when you Save. Comments start with #.
                </DialogDescription>
              </DialogHeader>
              <div className="flex min-h-[min(340px,50vh)] flex-1 shrink flex-col py-2">
                {envDialogOpen ? (
                  <RawEditor.Provider
                    initialEnv={env}
                    key={envEditorNonce}
                    onSubmit={handleSaveEnvFromRaw}
                  >
                    <RawEditor.Root className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                      <RawEditor.Input
                        className="min-h-0 flex-1"
                        textareaClassName="min-h-[min(260px,45vh)]"
                      />
                    </RawEditor.Root>
                    <DialogFooter>
                      <Button
                        onClick={() => handleEnvDialogChange(false)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <RawEditor.Submit variant="default">
                        Save
                      </RawEditor.Submit>
                    </DialogFooter>
                  </RawEditor.Provider>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
