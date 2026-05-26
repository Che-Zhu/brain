import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SidePane } from "./side-pane";

const noop = () => {
  /* test noop */
};

const ASIDE_RE = /<aside/;
const BODY_RE = /Pane body/;
const BUSY_RE = /aria-busy="true"/;
const CLOSE_LABEL_RE = /Close details/;
const CLOSED_RE = /aria-hidden="true"/;
const DESCRIPTION_RE = /Secondary copy/;
const MOTION_REDUCE_TRANSFORM_RE = /motion-reduce:transform-none/;
const MOTION_REDUCE_TRANSITION_RE = /motion-reduce:transition-none/;
const PANE_LABEL_RE = /aria-label="Details pane"/;
const POINTER_EVENTS_NONE_RE = /pointer-events-none/;
const RESOURCE_PANE_SURFACE_RE = /resource-pane-surface/;
const TITLE_RE = /Details/;
const TRANSLATE_CLOSED_RE = /translate-x-full/;

test("side pane renders shared chrome, accessibility labels, and motion-safe classes", () => {
  const html = renderToStaticMarkup(
    <SidePane
      busy
      closeAriaLabel="Close details"
      icon={<span data-slot="test-icon" />}
      label="Details pane"
      onClose={noop}
      subtitle="Secondary copy"
      title="Details"
    >
      <p>Pane body</p>
    </SidePane>
  );

  assert.match(html, ASIDE_RE);
  assert.match(html, PANE_LABEL_RE);
  assert.match(html, BUSY_RE);
  assert.match(html, CLOSE_LABEL_RE);
  assert.match(html, TITLE_RE);
  assert.match(html, DESCRIPTION_RE);
  assert.match(html, BODY_RE);
  assert.match(html, RESOURCE_PANE_SURFACE_RE);
  assert.match(html, MOTION_REDUCE_TRANSITION_RE);
});

test("side pane closed state is non-interactive and keeps reduced-motion structure", () => {
  const html = renderToStaticMarkup(
    <SidePane
      closeAriaLabel="Close"
      label="Details pane"
      onClose={noop}
      open={false}
      title="Details"
    >
      <p>Pane body</p>
    </SidePane>
  );

  assert.match(html, CLOSED_RE);
  assert.match(html, POINTER_EVENTS_NONE_RE);
  assert.match(html, TRANSLATE_CLOSED_RE);
  assert.match(html, MOTION_REDUCE_TRANSFORM_RE);
});
