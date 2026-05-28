import assert from "node:assert/strict";
import { test } from "node:test";

import { useI18n } from "./useI18n";

test("translator reference is stable across renders", () => {
  const first = useI18n();
  const second = useI18n();

  assert.equal(first, second);
  assert.equal(first.t, second.t);
});
