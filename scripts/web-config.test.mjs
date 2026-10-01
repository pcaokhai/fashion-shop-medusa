import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "../apps/storefront/node_modules/next/constants.js";
import config from "../apps/storefront/next.config.mjs";

const root = new URL("../", import.meta.url);

test("/_design (page.dev.tsx) is a page only in the dev-server phase [R-009-25]", () => {
  assert.ok(config(PHASE_DEVELOPMENT_SERVER).pageExtensions.includes("dev.tsx"));
  for (const phase of [PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER, "phase-export", "phase-test"]) {
    assert.ok(!config(phase).pageExtensions.some((e) => e.includes("dev")), phase);
  }
});

test("next agentRules is disabled so `next dev` never edits tracked rulebooks", () => {
  assert.equal(config(PHASE_DEVELOPMENT_SERVER).agentRules, false);
});

test("no tracked CLAUDE.md / AGENTS.md carries the nextjs-agent-rules block", () => {
  const files = execFileSync("git", ["ls-files", "*CLAUDE.md", "*AGENTS.md"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  assert.ok(files.length > 0);
  const bad = files.filter((f) => readFileSync(new URL(f, root), "utf8").includes("nextjs-agent-rules"));
  assert.deepEqual(bad, []);
});
