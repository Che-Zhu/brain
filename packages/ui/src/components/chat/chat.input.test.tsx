import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ChatDatabaseDeployButton,
  ChatDockerDeployButton,
  ChatGithubDeployButton,
  ChatSkillLibraryButton,
} from "./chat.input";

const noop = () => undefined;
const DOCKER_DEPLOY_ARIA_LABEL_RE = /aria-label="Docker deploy"/;
const SKILL_LIBRARY_ARIA_LABEL_RE = /aria-label="Skill library"/;

test("chat composer actions include GitHub, Docker, Database, and Skill controls in order", () => {
  const html = renderToStaticMarkup(
    <div>
      <ChatGithubDeployButton onComposerAction={noop} />
      <ChatDockerDeployButton onComposerAction={noop} />
      <ChatDatabaseDeployButton onComposerAction={noop} />
      <ChatSkillLibraryButton onComposerAction={noop} />
    </div>
  );

  const github = html.indexOf('data-slot="chat-github-deploy-button"');
  const docker = html.indexOf('data-slot="chat-docker-deploy-button"');
  const database = html.indexOf('data-slot="chat-database-deploy-button"');
  const skill = html.indexOf('data-slot="chat-skill-library-button"');

  assert.ok(github !== -1, "GitHub action is visible");
  assert.ok(docker !== -1, "Docker action is visible");
  assert.ok(database !== -1, "Database action is visible");
  assert.ok(skill !== -1, "Skill action is visible");
  assert.ok(github < docker, "GitHub appears before Docker");
  assert.ok(docker < database, "Docker appears before Database");
  assert.ok(database < skill, "Database appears before Skill");
  assert.match(html, DOCKER_DEPLOY_ARIA_LABEL_RE);
  assert.match(html, SKILL_LIBRARY_ARIA_LABEL_RE);
});
