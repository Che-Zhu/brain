"use client";

import { type ComponentContext, defineRegistry } from "@json-render/react";
import { GithubDeployer } from "@workspace/ui/components/github-deployer/github-deployer";
import { MetricsChart } from "@workspace/ui/components/metrics-chart/metrics-chart";

import { catalog } from "./catalog";

export const { registry } = defineRegistry(catalog, {
  components: {
    GithubDeployer: ({
      props,
    }: ComponentContext<typeof catalog, "GithubDeployer">) => (
      <GithubDeployer.Root
        states={{
          githubToken: props.githubToken ?? undefined,
          isLoading: props.isLoading,
          repos: props.repos ?? [],
          deployedRepo: props.deployedRepo ?? undefined,
        }}
      >
        <GithubDeployer.Shell>
          <GithubDeployer.Title />
          <GithubDeployer.Subtitle />
          <GithubDeployer.UrlInput />
          <GithubDeployer.AuthButton />
          <GithubDeployer.RepoSelect />
          <GithubDeployer.Complete />
        </GithubDeployer.Shell>
      </GithubDeployer.Root>
    ),
    MetricsChart: ({
      props,
    }: ComponentContext<typeof catalog, "MetricsChart">) => (
      <div className="h-56 min-h-56 w-full min-w-0">
        <MetricsChart.Variant0
          chartClassName={props.chartClassName ?? undefined}
          data={props.data}
          dataKey={props.dataKey}
        />
      </div>
    ),
  },
});
