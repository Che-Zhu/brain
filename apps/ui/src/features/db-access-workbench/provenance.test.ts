import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const provenance = readFileSync(join(moduleDir, "PROVENANCE.md"), "utf8");

const REQUIRED_PROVENANCE_TEXT = [
  "direct DataFlow database browsing UI port, not an approximation",
  "src/components/layout/TabBar.tsx",
  "src/components/layout/TabContent.tsx",
  "src/components/sidebar/Sidebar.tsx",
  "src/components/sidebar/SidebarTree/SidebarTreeProvider.tsx",
  "src/components/sidebar/SidebarTree/SidebarTree.Node.tsx",
  "src/stores/useTabStore.ts",
  "src/stores/useConnectionStore.ts",
];

test("DB Access Workbench provenance names the direct DataFlow browsing UI port", () => {
  for (const requiredText of REQUIRED_PROVENANCE_TEXT) {
    assert.ok(provenance.includes(requiredText));
  }
});
