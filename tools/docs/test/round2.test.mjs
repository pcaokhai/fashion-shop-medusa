/* global process, URL */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBugs } from "../lib/bug.mjs";
import { checkProgress } from "../lib/progress.mjs";
import { bug, makeRoot, cleanup, baseFiles } from "./fixture.mjs";

const ENTRY = fileURLToPath(new URL("../check-cli.mjs", import.meta.url));
const one = (body) => {
  const root = makeRoot({ "docs/bugs/BUG-000-template.md": "t", "docs/bugs/BUG-001-x.md": body });
  try {
    return checkBugs(root).violations;
  } finally {
    cleanup(root);
  }
};
const prog = (body) => {
  const root = makeRoot({ "docs/progress/PROGRESS.md": body });
  try {
    return checkProgress(root).violations;
  } finally {
    cleanup(root);
  }
};
const hdr = "# BUG-001 t\nSeverity: S2 · Status: CLOSED\n";

test("[VCK-008-AC1] entry run through a symlink still validates (exit 1 + violation), and via the real path", () => {
  const f = baseFiles();
  f["docs/bugs/BUG-001-open.md"] = bug("001", { sev: "S9" });
  const root = makeRoot(f);
  const dir = mkdtempSync(join(tmpdir(), "docs-check-link-"));
  try {
    const link = join(dir, "renamed.mjs");
    symlinkSync(ENTRY, link);
    for (const entry of [ENTRY, link]) {
      const r = spawnSync(process.execPath, [entry], { env: { ...process.env, VCK_ROOT: root }, encoding: "utf8" });
      assert.equal(r.status, 1, entry);
      assert.match(r.stderr, /^docs\/bugs\/BUG-001-open\.md: /m, entry);
    }
  } finally {
    cleanup(root);
    cleanup(dir);
  }
});

test("[VCK-008-AC1] a comment spanning headings hides them: closed bug fails", () => {
  const md = `${hdr}\n<!-- start\n## Root cause (5 whys)\nreal\n## Regression test\n[BUG-001]\n-->\n`;
  assert.ok(one(md).length >= 1);
});
test("[VCK-008-AC1] comment between sections not touching headings still passes", () => {
  const md = `${hdr}\n## Root cause (5 whys)\n1. real\n<!--\nnote\n-->\n## Regression test\n[BUG-001]\n`;
  assert.deepEqual(one(md), []);
});
test("[VCK-008-AC1] comment-like text inside a fence is literal (hides nothing)", () => {
  const md = `${hdr}\n## Root cause (5 whys)\n1. real\n## Evidence\n\`\`\`\n<!-- x\n\`\`\`\n## Regression test\n[BUG-001]\n`;
  assert.deepEqual(one(md), []);
});
test("[VCK-008-AC1] unterminated <!-- fails closed; lone --> is not root-cause content", () => {
  assert.ok(one(`${hdr}\n## Root cause (5 whys)\n1. real\n## Regression test\n[BUG-001]\n<!-- oops\n`).length >= 1);
  assert.match(one(`${hdr}\n## Root cause (5 whys)\n-->\n## Regression test\n[BUG-001]\n`).join(), /Root cause/);
});
test("[VCK-008-AC1] a comment hiding the title or header line fails", () => {
  assert.ok(one("<!-- # BUG-001 t\nSeverity: S2 · Status: OPEN -->\n").length >= 1);
  assert.deepEqual(one("# BUG-001 t\nSeverity: S2 · Status: OPEN <!-- ok -->\n"), []);
});
test("[VCK-008-AC3] comment wrapping the Now heading fails; unterminated comment fails", () => {
  assert.equal(prog("# P\n<!--\n## Now\n- a\n-->\n## Log\n").length, 1);
  assert.ok(prog("# P\n## Now\n- a\n<!-- x\n").length >= 1);
});
test("[VCK-008-AC3] comment lines inside Now still count toward the limit", () => {
  const rep = (n, l) => Array.from({ length: n }, () => l).join("\n");
  const inner = `${rep(5, "- a")}\n${rep(6, "<!-- c -->")}\n${rep(5, "- b")}`;
  assert.equal(prog(`# P\n## Now\n${inner}\n## Log\n`).length, 1);
});
test("[VCK-008-AC1] lowercase severity value or keyword is rejected", () => {
  assert.ok(one("# BUG-001 t\nSeverity: s2 · Status: OPEN\n").length >= 1);
  assert.ok(one("# BUG-001 t\nseverity: S2 · Status: OPEN\n").length >= 1);
  assert.ok(one("# BUG-001 t\nSeverity: S2 · Status: Open\n").length >= 1);
});
