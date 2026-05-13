"use client";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { type ComponentProps, useMemo } from "react";

import {
  GithubDeployerContext,
  GithubDeployerRoot,
  useGithubDeployer,
} from "./github-deployer.context";
import type { GithubDeployerRepo } from "./github-deployer.types";

/** GitHub invertocat path (matches common monochrome mark). */
const GITHUB_MARK_PATH =
  "M12 2c5.5228 0 10 4.47715 10 10 0 4.5716 -3.0686 8.4239 -7.2578 9.6162v-3.0117c0 -0.7275 -0.1595 -1.4465 -0.4678 -2.1055 2.1883 -0.7822 4.2783 -2.4447 4.2783 -4.4355 0 -1.2663 -0.4671 -2.75174 -1.5127 -3.63186V6l-2.9462 0.98828c-0.6589 -0.16036 -1.3628 -0.24706 -2.0938 -0.24707 -0.731 0 -1.4349 0.08673 -2.09375 0.24707L6.95996 6v2.43164c-1.04555 0.88009 -1.51163 2.36566 -1.51172 3.63186 0 1.9907 2.08913 3.6533 4.27735 4.4355 -0.26358 0.5635 -0.41862 1.1711 -0.45801 1.7901 -0.13854 0.0283 -0.25191 0.0415 -0.34473 0.04 -0.20756 -0.0033 -0.36606 -0.06 -0.51953 -0.1562 -1.11532 -0.7 -1.54401 -1.9835 -3.05566 -2.1543 -0.19076 -0.0214 -0.3474 0.1371 -0.34766 0.3291 0 0.1922 0.15921 0.3423 0.34473 0.3925 1.44216 0.39 1.42755 3.2266 3.54785 3.2598 0.11976 0.0019 0.24101 -0.0069 0.36426 -0.0186v1.6348C5.06807 20.4236 2 16.5713 2 12 2 6.47715 6.47715 2 12 2";

const authRowClass =
  "inline-flex min-h-0 min-w-0 shrink-0 items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-xs leading-none";

function hasGithubToken(token: string | null | undefined): token is string {
  return typeof token === "string" && token.length > 0;
}

function GithubDeployerTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-slot="github-deployer-title"
      {...props}
    >
      <svg
        aria-hidden
        className="size-5 shrink-0 text-foreground"
        height={20}
        viewBox="0 0 24 24"
        width={20}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>GitHub</title>
        <path d={GITHUB_MARK_PATH} fill="currentColor" />
      </svg>
      <span className="font-medium text-foreground text-sm">Github Import</span>
    </div>
  );
}

function GithubDeployerSubtitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("w-full min-w-0 text-muted-foreground text-xs", className)}
      data-slot="github-deployer-subtitle"
      {...props}
    >
      Import repository from URL or GitHub authorization.
    </p>
  );
}

function GithubDeployerAuthButton({ className }: { className?: string }) {
  const {
    actions: { onAuthorize },
    states: { githubToken, deployedRepo, isLoading },
  } = useGithubDeployer();

  if (deployedRepo) {
    return null;
  }
  if (hasGithubToken(githubToken)) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          authRowClass,
          "pointer-events-none w-full cursor-default opacity-90",
          className
        )}
        data-slot="github-deployer-auth-loading"
        role="status"
      >
        <Spinner aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate">Authorizing…</span>
      </div>
    );
  }

  return (
    <Button
      aria-label="Authorize GitHub"
      className={cn(authRowClass, "w-full", className)}
      data-slot="github-deployer-auth-connect"
      disabled={!onAuthorize}
      onClick={onAuthorize}
      size="lg"
      type="button"
      variant="outline"
    >
      <ShieldCheck aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 truncate">Authorize GitHub</span>
    </Button>
  );
}

function GithubDeployerRepoSelect({ className }: { className?: string }) {
  const {
    actions: { onDeploy },
    selectedRepoId,
    setSelectedRepoId,
    states: { githubToken, deployedRepo, isLoading, repos },
  } = useGithubDeployer();

  const items = useMemo(() => [...repos], [repos]);
  const selectedRepo = useMemo(
    () => repos.find((r) => r.id === selectedRepoId) ?? null,
    [repos, selectedRepoId]
  );

  if (deployedRepo || !hasGithubToken(githubToken)) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-live="polite"
        className={cn(
          "flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground text-xs",
          className
        )}
        data-slot="github-deployer-repos-loading"
        role="status"
      >
        <Spinner aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate">Loading repositories…</span>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <p
        className="w-full min-w-0 text-muted-foreground text-xs"
        data-slot="github-deployer-repo-empty"
      >
        No repositories
      </p>
    );
  }

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      data-slot="github-deployer-repo-select"
    >
      <Combobox<GithubDeployerRepo>
        autoHighlight
        isItemEqualToValue={(a, b) => a.id === b.id}
        items={items}
        itemToStringLabel={(r) => r.fullName ?? r.name}
        itemToStringValue={(r) => r.fullName ?? r.name}
        onValueChange={(next) => {
          setSelectedRepoId(next?.id ?? "");
        }}
        value={selectedRepo}
      >
        <ComboboxInput
          className="w-full"
          placeholder="Search or choose repository"
        />
        <ComboboxContent>
          <ComboboxEmpty>No matching repositories.</ComboboxEmpty>
          <ComboboxList>
            {(repo) => (
              <ComboboxItem key={repo.id} value={repo}>
                {repo.fullName ?? repo.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Button
        className="w-full"
        data-slot="github-deployer-deploy"
        disabled={!(selectedRepoId && onDeploy)}
        onClick={() => {
          const repo = repos.find((r) => r.id === selectedRepoId);
          if (repo && onDeploy) {
            onDeploy(repo);
          }
        }}
        size="lg"
        type="button"
      >
        Deploy
      </Button>
    </div>
  );
}

function GithubDeployerComplete({ className }: ComponentProps<"div">) {
  const {
    states: { deployedRepo },
  } = useGithubDeployer();

  if (!deployedRepo) {
    return null;
  }

  const label = deployedRepo.fullName ?? deployedRepo.name;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 p-2",
        className
      )}
      data-slot="github-deployer-complete"
      role="status"
    >
      <CheckCircle2
        aria-hidden
        className="size-4 shrink-0 text-foreground"
        strokeWidth={2}
      />
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-medium text-foreground text-sm">Deployed</span>
        <span className="truncate text-muted-foreground text-xs">{label}</span>
      </div>
    </div>
  );
}

function GithubDeployerShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-3", className)}
      data-slot="github-deployer-shell"
      {...props}
    />
  );
}

/** Compound GitHub OAuth + deploy repo picker; state comes from `Root`. */
const GithubDeployerBase = Object.assign(GithubDeployerShell, {
  AuthButton: GithubDeployerAuthButton,
  Complete: GithubDeployerComplete,
  Context: GithubDeployerContext,
  RepoSelect: GithubDeployerRepoSelect,
  Root: GithubDeployerRoot,
  Shell: GithubDeployerShell,
  Subtitle: GithubDeployerSubtitle,
  Title: GithubDeployerTitle,
  useGithubDeployer,
});

GithubDeployerAuthButton.displayName = "GithubDeployer.AuthButton";
GithubDeployerComplete.displayName = "GithubDeployer.Complete";
GithubDeployerRepoSelect.displayName = "GithubDeployer.RepoSelect";
GithubDeployerShell.displayName = "GithubDeployer.Shell";
GithubDeployerSubtitle.displayName = "GithubDeployer.Subtitle";
GithubDeployerTitle.displayName = "GithubDeployer.Title";

export const GithubDeployer = GithubDeployerBase;

export type {
  GithubDeployerActions,
  GithubDeployerRepo,
  GithubDeployerResolvedActions,
  GithubDeployerStates,
  GithubDeployerValue,
} from "./github-deployer.types";
