import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GithubDeployer } from "./github-deployer";

const noop = () => undefined;
const URL_INPUT_RE = /data-slot="github-deployer-url-input"/;
const URL_PLACEHOLDER_RE = /https:\/\/github.com\/owner\/repo/;
const AUTH_BUTTON_RE = /data-slot="github-deployer-auth-connect"/;
const REPO_SELECT_RE = /data-slot="github-deployer-repo-select"/;
const REPO_EMPTY_RE = /data-slot="github-deployer-repo-empty"/;
const PUBLIC_REPO_HELP_RE = /Paste a public GitHub repository URL/;

test("GithubDeployer shows URL input and authorization when unauthenticated", () => {
  const html = renderToStaticMarkup(
    <GithubDeployer.Root
      actions={{ onAuthorize: noop, onDeploy: noop }}
      states={{ githubToken: "", repos: [] }}
    >
      <GithubDeployer.Shell>
        <GithubDeployer.UrlInput />
        <GithubDeployer.AuthButton />
        <GithubDeployer.RepoSelect />
      </GithubDeployer.Shell>
    </GithubDeployer.Root>
  );

  assert.match(html, URL_INPUT_RE);
  assert.match(html, URL_PLACEHOLDER_RE);
  assert.match(html, PUBLIC_REPO_HELP_RE);
  assert.match(html, AUTH_BUTTON_RE);
  assert.doesNotMatch(html, REPO_SELECT_RE);
});

test("GithubDeployer keeps URL input while showing authorized repo choices", () => {
  const html = renderToStaticMarkup(
    <GithubDeployer.Root
      actions={{ onAuthorize: noop, onDeploy: noop }}
      states={{
        githubToken: "gho_test",
        repos: [{ fullName: "sealai/example", id: "1", name: "example" }],
      }}
    >
      <GithubDeployer.Shell>
        <GithubDeployer.UrlInput />
        <GithubDeployer.AuthButton />
        <GithubDeployer.RepoSelect />
      </GithubDeployer.Shell>
    </GithubDeployer.Root>
  );

  assert.match(html, URL_INPUT_RE);
  assert.match(html, REPO_SELECT_RE);
  assert.doesNotMatch(html, AUTH_BUTTON_RE);
  assert.doesNotMatch(html, REPO_EMPTY_RE);
});
