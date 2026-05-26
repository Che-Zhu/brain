import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ChatDatabaseDeployButton,
  ChatDockerDeployButton,
  ChatGithubDeployButton,
} from "./chat.input";

const noop = () => undefined;
const DOCKER_DEPLOY_ARIA_LABEL_RE = /aria-label="Docker deploy"/;

test("chat composer deploy actions include GitHub, Docker, and Database controls in order", () => {
  const html = renderToStaticMarkup(
    <div>
      <ChatGithubDeployButton onComposerAction={noop} />
      <ChatDockerDeployButton onComposerAction={noop} />
      <ChatDatabaseDeployButton onComposerAction={noop} />
    </div>
  );

  const github = html.indexOf('data-slot="chat-github-deploy-button"');
  const docker = html.indexOf('data-slot="chat-docker-deploy-button"');
  const database = html.indexOf('data-slot="chat-database-deploy-button"');

  assert.ok(github !== -1, "GitHub action is visible");
  assert.ok(docker !== -1, "Docker action is visible");
  assert.ok(database !== -1, "Database action is visible");
  assert.ok(github < docker, "GitHub appears before Docker");
  assert.ok(docker < database, "Docker appears before Database");
  assert.match(html, DOCKER_DEPLOY_ARIA_LABEL_RE);
});
