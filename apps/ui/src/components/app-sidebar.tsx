"use client";

import { useApsK8sList, useDbsK8sList } from "@workspace/api/hooks";
import { apItemsFromList } from "@workspace/api/lib/ap-list";
import type { K8sGetResponse } from "@workspace/api/schemas/k8s-get";
import { PROJECT_UID_LABEL } from "@workspace/crossplane/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useAtomValue } from "jotai";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useApCompositions } from "@/hooks/compositions/use-ap-composition";
import { useDbCompositions } from "@/hooks/compositions/use-db-compositions";
import { useProjectsExplorer } from "@/hooks/use-projects-explorer";
import { kubeconfigAtom, namespaceAtom } from "@/store/auth-store";

interface WorkloadShortcutCandidate {
  createdAt: string;
  iconUrl?: string;
  name: string;
  projectUid: string;
  useDockerIcon?: boolean;
}

const DOCKER_AP_COMPOSITION_NAMES = new Set([
  "aps-deployment-ingress-go-templating",
]);
const SIDEBAR_ICON_BUTTON_CLASS =
  "flex size-9 items-center justify-center rounded-lg text-[#e5e5e5] transition-colors hover:bg-[#202733] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#60A5FA]";
const SIDEBAR_ICON_BUTTON_ACTIVE_CLASS = "bg-[#2b3340] shadow-sm";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return asRecord(asRecord(value)?.metadata) ?? {};
}

function metadataName(value: unknown): string {
  return nonEmptyString(metadataRecord(value).name) ?? "";
}

function metadataCreationTimestamp(value: unknown): string {
  return nonEmptyString(metadataRecord(value).creationTimestamp) ?? "";
}

function projectUidFromResource(value: unknown): string | undefined {
  const labels = asRecord(metadataRecord(value).labels);
  return nonEmptyString(labels?.[PROJECT_UID_LABEL]);
}

function compositionNameFromSpec(
  spec: Record<string, unknown>
): string | undefined {
  const crossplane = asRecord(spec.crossplane);
  const crossplaneCompositionRef = asRecord(crossplane?.compositionRef);
  const crossplaneCompositionName = nonEmptyString(
    crossplaneCompositionRef?.name
  );
  if (crossplaneCompositionName !== undefined) {
    return crossplaneCompositionName;
  }

  const compositionRef = asRecord(spec.compositionRef);
  return nonEmptyString(compositionRef?.name);
}

function compareWorkloadCandidates(
  a: WorkloadShortcutCandidate,
  b: WorkloadShortcutCandidate
): number {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);

  if (aValid && bValid && aTime !== bTime) {
    return aTime - bTime;
  }
  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function selectedWorkloadByProject(
  data: K8sGetResponse | undefined,
  compositionIconByName: ReadonlyMap<string, string>
): Map<string, WorkloadShortcutCandidate> {
  const result = new Map<string, WorkloadShortcutCandidate>();

  for (const item of apItemsFromList(data)) {
    const projectUid = projectUidFromResource(item);
    if (projectUid === undefined) {
      continue;
    }

    const spec = asRecord(asRecord(item)?.spec) ?? {};
    const compositionName = compositionNameFromSpec(spec);
    const useDockerIcon =
      compositionName !== undefined &&
      DOCKER_AP_COMPOSITION_NAMES.has(compositionName);
    const iconUrl =
      compositionName === undefined
        ? undefined
        : compositionIconByName.get(compositionName);
    const candidate: WorkloadShortcutCandidate = {
      createdAt: metadataCreationTimestamp(item),
      ...(iconUrl === undefined || useDockerIcon ? {} : { iconUrl }),
      name: metadataName(item),
      projectUid,
      ...(useDockerIcon ? { useDockerIcon } : {}),
    };
    const current = result.get(projectUid);
    if (
      current === undefined ||
      compareWorkloadCandidates(candidate, current) < 0
    ) {
      result.set(projectUid, candidate);
    }
  }

  return result;
}

function projectUidFromPathname(pathname: string): string | undefined {
  const prefix = "/project/";
  if (!pathname.startsWith(prefix)) {
    return undefined;
  }
  const encoded = pathname.slice(prefix.length).split("/")[0];
  if (!encoded) {
    return undefined;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function ProjectShortcutIcon({
  iconUrl,
  useDockerIcon,
}: {
  iconUrl?: string;
  useDockerIcon?: boolean;
}) {
  const resolvedIconUrl = iconUrl?.trim();

  if (resolvedIconUrl && !useDockerIcon) {
    return (
      <span
        aria-hidden
        className="block size-4 bg-center bg-contain bg-no-repeat"
        style={{
          backgroundImage: `url(${JSON.stringify(resolvedIconUrl)})`,
        }}
      />
    );
  }

  return <DockerLogo />;
}

function SealosLogo() {
  return (
    <svg aria-hidden className="size-4" fill="none" viewBox="0 0 16 16">
      <title>Sealos</title>
      <path
        d="M3.46465 7.52338C4.37618 8.85606 6.26563 8.73275 6.26563 8.73275C5.79706 8.27651 5.4888 7.85726 5.4518 6.67256C5.41481 5.48786 4.74895 5.16726 4.74895 5.16726C5.96306 4.40655 5.52579 3.57564 5.4888 2.65368C5.46603 2.08362 5.80655 1.65489 6.07024 1.41207C3.15733 1.84175 0.921671 4.35153 0.921671 7.38395C0.921671 7.59832 0.944435 7.79846 0.966251 8.00713C1.07818 7.70835 2.62237 6.29126 3.4656 7.52338H3.46465Z"
        fill="url(#sealos-logo-a)"
      />
      <path
        d="M13.7845 3.90384C13.1405 3.36129 12.449 3.22091 11.9169 3.22091C10.3926 3.22091 9.10735 4.46347 9.03337 5.98584C9.02958 6.05414 9.02957 6.10346 9.02957 6.16132C9.02957 6.26471 9.03906 6.37663 9.04665 6.46484C9.06088 6.61756 9.11305 6.86227 9.15004 7.07569C9.19462 7.33464 9.21359 7.47218 9.22307 7.74155C9.23161 8.00904 9.20695 8.29644 9.18039 8.47381C9.1396 8.75078 9.05329 9.08466 8.95275 9.33886C8.65206 10.1015 8.15883 10.7389 7.53091 11.1989C6.85841 11.6921 6.02656 11.9928 5.09511 11.9928C4.42166 11.9928 3.80512 11.8373 3.24929 11.5584C2.10253 10.9817 1.28016 9.91746 1.02596 8.58858C1.52773 11.9871 4.4966 14.588 8.03458 14.588C11.9245 14.588 15.0783 11.4341 15.0783 7.54426C15.0783 6.98843 15.0166 6.48951 14.9303 6.06647C14.8658 5.75061 14.7624 5.39492 14.6116 5.04396C14.4172 4.59152 14.1677 4.22729 13.7845 3.90384Z"
        fill="url(#sealos-logo-b)"
      />
      <mask
        height="12"
        id="sealos-logo-mask"
        maskUnits="userSpaceOnUse"
        style={{ maskType: "luminance" }}
        width="15"
        x="1"
        y="3"
      >
        <path
          d="M13.7845 3.90384C13.1405 3.36129 12.449 3.22091 11.9169 3.22091C10.3926 3.22091 9.10735 4.46347 9.03337 5.98584C9.02958 6.05414 9.02957 6.10346 9.02957 6.16132C9.02957 6.26471 9.03906 6.37663 9.04665 6.46484C9.06088 6.61756 9.11305 6.86227 9.15004 7.07569C9.19462 7.33464 9.21359 7.47218 9.22307 7.74155C9.23161 8.00904 9.20695 8.29644 9.18039 8.47381C9.1396 8.75078 9.05329 9.08466 8.95275 9.33886C8.65206 10.1015 8.15883 10.7389 7.53091 11.1989C6.85841 11.6921 6.02656 11.9928 5.09511 11.9928C4.42166 11.9928 3.80512 11.8373 3.24929 11.5584C2.10253 10.9817 1.28016 9.91746 1.02596 8.58858C1.52773 11.9871 4.4966 14.588 8.03458 14.588C11.9245 14.588 15.0783 11.4341 15.0783 7.54426C15.0783 6.98843 15.0166 6.48951 14.9303 6.06647C14.8658 5.75061 14.7624 5.39492 14.6116 5.04396C14.4172 4.59152 14.1677 4.22729 13.7845 3.90384Z"
          fill="white"
        />
      </mask>
      <g mask="url(#sealos-logo-mask)">
        <path
          d="M7.27192 13.2572C10.7 13.2572 13.479 10.4782 13.479 7.05009C13.479 3.62199 10.7 0.842968 7.27192 0.842968C3.84383 0.842968 1.06481 3.62199 1.06481 7.05009C1.06481 10.4782 3.84383 13.2572 7.27192 13.2572Z"
          fill="url(#sealos-logo-c)"
        />
      </g>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="sealos-logo-a"
          x1="5.21909"
          x2="-0.711411"
          y1="0.584486"
          y2="9.93028"
        >
          <stop stopColor="#0AA3F9" />
          <stop offset="1" stopColor="#B5B4FF" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="sealos-logo-b"
          x1="17.169"
          x2="7.74214"
          y1="14.9058"
          y2="2.77796"
        >
          <stop stopColor="#0AA3F9" />
          <stop offset="1" stopColor="#B5B4FF" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="sealos-logo-c"
          x1="11.5776"
          x2="0.763467"
          y1="0.84607"
          y2="11.1107"
        >
          <stop stopColor="#7ABBFD" />
          <stop offset="1" stopColor="#7ABBFD" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DockerLogo() {
  return (
    <svg aria-hidden className="size-4" fill="none" viewBox="0 0 16 16">
      <title>Docker</title>
      <path
        d="M3.21333 11.5167C2.75733 11.5167 2.344 11.1433 2.344 10.69C2.344 10.2367 2.71733 9.86133 3.214 9.86133C3.71267 9.86133 4.08733 10.2347 4.08733 10.6893C4.08733 11.144 3.67267 11.516 3.21733 11.516L3.21333 11.5167ZM13.888 7.008C13.798 6.34667 13.388 5.808 12.848 5.39467L12.638 5.228L12.4687 5.43467C12.1393 5.808 12.0087 6.47 12.0487 6.96467C12.0887 7.33933 12.2087 7.71133 12.418 8.00067C12.2487 8.08733 12.0393 8.16733 11.878 8.252C11.5161 8.36752 11.1379 8.4238 10.758 8.41867H0.0646667L0.0246667 8.66533C-0.0579994 9.4712 0.0711477 10.2847 0.399333 11.0253L0.562 11.3153V11.3553C1.562 13.0107 3.342 13.7553 5.28067 13.7553C9.01 13.7553 12.0687 12.142 13.5187 8.66667C14.4687 8.708 15.428 8.46 15.8787 7.54933L15.9987 7.34267L15.7987 7.218C15.2587 6.88867 14.5187 6.84467 13.8987 7.01133L13.8867 7.01267L13.888 7.008ZM8.54933 6.34667H6.93067V7.96H8.55067V6.34533L8.54933 6.34733V6.34667ZM8.54933 4.318H6.93067V5.93133H8.55067V4.32L8.54933 4.318ZM8.54933 2.24866H6.93067V3.862H8.55067V2.24866H8.54933ZM10.5293 6.34667H8.92V7.96H10.5333V6.34533L10.5287 6.34733L10.5293 6.34667ZM4.53067 6.34667H2.922V7.96H4.53667V6.34533L4.53 6.34733L4.53067 6.34667ZM6.55067 6.34667H4.95067V7.96H6.56V6.34533L6.55 6.34733L6.55067 6.34667ZM2.53067 6.34667H0.933333V7.96H2.552V6.34533L2.532 6.34733L2.53067 6.34667ZM6.55067 4.318H4.95067V5.93133H6.56V4.32L6.55 4.318H6.55067ZM4.52067 4.318H2.92467V5.93133H4.53333V4.32L4.52267 4.318H4.52067Z"
        fill="#60A5FA"
      />
    </svg>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const kubeconfig = useAtomValue(kubeconfigAtom).trim();
  const namespace = useAtomValue(namespaceAtom);
  const currentProjectUid = projectUidFromPathname(pathname);
  const projectsActive = pathname === "/project";

  const { states } = useProjectsExplorer({
    kubeconfig,
    ns: namespace,
  });

  const projectUidLabelExistence = PROJECT_UID_LABEL;
  const { data: apsData } = useApsK8sList({
    kubeconfig,
    labelSelector: projectUidLabelExistence,
    namespace,
  });
  const { data: dbsData } = useDbsK8sList({
    kubeconfig,
    labelSelector: projectUidLabelExistence,
    namespace,
  });
  const { items: apCompositionRows } = useApCompositions({
    kubeconfig,
    toItems: true,
  });
  const { items: dbCompositionRows } = useDbCompositions({
    kubeconfig,
    toItems: true,
  });

  const apCompositionIconByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of apCompositionRows ?? []) {
      const iconUrl = row.iconUrl?.trim();
      if (iconUrl) {
        map.set(row.metadata.compositionName, iconUrl);
      }
    }
    return map;
  }, [apCompositionRows]);

  const dbCompositionIconByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of dbCompositionRows ?? []) {
      const iconUrl = row.iconUrl?.trim();
      if (iconUrl) {
        map.set(row.metadata.compositionName, iconUrl);
      }
    }
    return map;
  }, [dbCompositionRows]);

  const apByProject = useMemo(
    () => selectedWorkloadByProject(apsData, apCompositionIconByName),
    [apsData, apCompositionIconByName]
  );
  const dbByProject = useMemo(
    () => selectedWorkloadByProject(dbsData, dbCompositionIconByName),
    [dbsData, dbCompositionIconByName]
  );

  return (
    <aside
      className="flex h-svh w-13 shrink-0 flex-col items-center border-[#e5e5e5]/15 border-r"
      data-slot="app-sidebar"
      style={{
        backgroundColor: "#101219",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-start gap-3 px-2 py-2.5">
        <span
          aria-label="Sealos"
          className="flex size-9 shrink-0 items-center justify-center"
          role="img"
        >
          <SealosLogo />
        </span>

        <nav
          aria-label="Project shortcuts"
          className="flex min-h-0 w-9 flex-1 flex-col gap-1.5 overflow-y-auto"
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  aria-label="More projects"
                  className={cn(
                    SIDEBAR_ICON_BUTTON_CLASS,
                    projectsActive && SIDEBAR_ICON_BUTTON_ACTIVE_CLASS
                  )}
                  href="/project"
                />
              }
            >
              <LayoutGrid aria-hidden className="size-4" strokeWidth={1.33} />
            </TooltipTrigger>
            <TooltipContent side="right">More projects</TooltipContent>
          </Tooltip>

          {states.projects.map((project) => {
            const ap = apByProject.get(project.id);
            const db =
              ap === undefined ? dbByProject.get(project.id) : undefined;
            const shortcut = ap ?? db;
            const iconUrl = shortcut?.useDockerIcon
              ? undefined
              : shortcut?.iconUrl;
            const active = currentProjectUid === project.id;

            return (
              <Tooltip key={project.id}>
                <TooltipTrigger
                  render={
                    <Link
                      aria-label={project.name}
                      className={cn(
                        SIDEBAR_ICON_BUTTON_CLASS,
                        active && SIDEBAR_ICON_BUTTON_ACTIVE_CLASS
                      )}
                      href={`/project/${encodeURIComponent(project.id)}`}
                    />
                  }
                >
                  <ProjectShortcutIcon
                    iconUrl={iconUrl}
                    useDockerIcon={
                      shortcut?.useDockerIcon === true || iconUrl === undefined
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="right">{project.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
