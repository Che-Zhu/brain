import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SkillLibraryPane } from "./skill-library-pane";

const noop = () => {
  /* test noop */
};

const INSTALL_COMMAND_RE = /npx skills add labring\/seakills/;
const OLD_AVAILABLE_SKILL_RE = /Available skill/;
const OLD_DETAILS_RE = /Details/;
const PANE_LABEL_RE = /aria-label="Skill library pane"/;
const SEVEN_STEPS_RE = /7 steps/;
const STEP_1_RE = /1\. Install Skills and Docker Locally/;
const STEP_6_RE = /6\. Push the Docker Image and Apply Runtime Manifests/;
const STEP_7_RE = /7\. Automatically Deploy and Generate an Accessible Domain/;
const COPY_INSTALL_COMMAND_RE = /aria-label="Copy install command"/;
const TITLE_RE = /Sealos Skills Workflow/;

test("skill library pane renders the static Sealos Skills workflow", () => {
  const html = renderToStaticMarkup(<SkillLibraryPane onClose={noop} />);

  assert.match(html, PANE_LABEL_RE);
  assert.match(html, TITLE_RE);
  assert.match(html, SEVEN_STEPS_RE);
  assert.match(html, INSTALL_COMMAND_RE);
  assert.match(html, COPY_INSTALL_COMMAND_RE);
  assert.match(html, STEP_1_RE);
  assert.match(html, STEP_6_RE);
  assert.match(html, STEP_7_RE);
  assert.doesNotMatch(html, OLD_AVAILABLE_SKILL_RE);
  assert.doesNotMatch(html, OLD_DETAILS_RE);
});
