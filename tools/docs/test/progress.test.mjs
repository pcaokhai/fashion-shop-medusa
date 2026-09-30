import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProgress } from "../lib/progress.mjs";
import { section } from "../lib/sections.mjs";
import { progress, makeRoot, cleanup } from "./fixture.mjs";

const run = (body) => {
  const root = makeRoot(body === null ? { x: "y" } : { "docs/progress/PROGRESS.md": body });
  try {
    return checkProgress(root);
  } finally {
    cleanup(root);
  }
};
const now = (inner) => `# P\n\n## Now\n${inner}\n## Log\nx\n`;
const lines = (n) => Array.from({ length: n }, (_, i) => `- l${i}`).join("\n");

test("[VCK-008-AC3] Now of 15 lines passes and reports count", () => {
  const r = run(progress(15));
  assert.deepEqual(r.violations, []);
  assert.equal(r.lines, 15);
});
test("[VCK-008-AC3] Now of 16 lines fails", () => {
  assert.match(run(progress(16)).violations.join(), /^docs\/progress\/PROGRESS\.md: .*16/);
});
test("[VCK-008-AC3] 15 lines plus leading/trailing blanks passes", () => {
  assert.deepEqual(run(now(`\n\n${lines(15)}\n\n\n`)).violations, []);
});
test("[VCK-008-AC3] interior blank lines count", () => {
  assert.equal(run(now(`${lines(8)}\n\n${lines(8)}`)).violations.length, 1);
});
test("[VCK-008-AC3] missing heading fails", () => {
  assert.equal(run("# P\n## Log\nx\n").violations.length, 1);
});
test("[VCK-008-AC3] empty block fails", () => {
  assert.equal(run(now("\n\n")).violations.length, 1);
});
test("[VCK-008-AC3] duplicate ## Now fails", () => {
  assert.equal(run(`${now("- a")}\n## Now\n- b\n`).violations.length, 1);
});
test("[VCK-008-AC3] missing PROGRESS file fails closed", () => {
  assert.match(run(null).violations.join(), /cannot read/);
});
test("[VCK-008-AC3] ## Now at EOF is handled", () => {
  assert.deepEqual(run("# P\n## Now\n- a\n- b").violations, []);
  assert.equal(run("# P\n## Now").violations.length, 1);
});
test("section(): heading must match exactly, stops at next '## '", () => {
  assert.deepEqual(section("## Nowhere\na\n## Now\nb\n## X\nc", "## Now"), ["b"]);
  assert.equal(section("## Nowhere\na", "## Now"), null);
});
