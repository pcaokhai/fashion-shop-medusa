/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cleanup } from "./fixture.mjs";
import { requiredSections } from "../lib/release-doc.mjs";
import { sections, trimBlank } from "../lib/sections.mjs";
import { CHECK_CLI, TEMPLATE, g, repoWith, runRelease } from "./release-fixture.mjs";

const RELEASE = "docs/releases/RELEASE-1.2.3.md";
const read = (root, rel) => readFileSync(join(root, rel), "utf8");
const fresh = (t, ...args) => {
  const root = repoWith(...args);
  t.after(() => cleanup(root));
  return root;
};
const check = (root) => spawnSync(process.execPath, [CHECK_CLI], { env: { ...process.env, VCK_ROOT: root }, encoding: "utf8" });

/** Replaces the body of every section still equal to the template's with `None.`. */
function fill(md) {
  const norm = (lines) => trimBlank(lines.map((l) => l.trimEnd())).join("\n");
  for (const h of requiredSections(TEMPLATE)) {
    if (norm(sections(md, h)[0]) === norm(sections(TEMPLATE, h)[0])) md = md.replace(`${h}\n${sections(md, h)[0].join("\n")}`, `${h}\nNone.\n`);
  }
  return md;
}

const HOSTILE = [
  "feat: a | b | c (VCK-101)",
  "fix: ## Heading (VCK-102)",
  "feat: ``` fence",
  "feat: <!-- x",
  "fix: --> y",
  "feat: [BUG-001] `code` \\| tail",
  "fix: crlf\r\nbreak (BUG-002)",
  "﻿feat: bom subject",
  `feat: ${"x".repeat(500)}`,
  "## Heading",
  "```",
  "<!-- x",
  "--> y",
  "[BUG-001]",
  "| a | b |",
];

test("[VCK-008-AC2] hostile subjects: 9 sections, fixed index row, no fence or comment opens, filled draft passes check-cli", (t) => {
  const root = fresh(t, HOSTILE);
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 0, r.err);
  const md = read(root, RELEASE);
  const lines = md.split("\n");
  assert.equal(lines.filter((l) => /^## /.test(l)).length, 9);
  assert.equal(lines.filter((l) => /^\s*(```|~~~)/.test(l)).length, TEMPLATE.split("\n").filter((l) => /^\s*(```|~~~)/.test(l)).length);
  const opens = (s) => (s.match(/<!--/g) ?? []).length;
  assert.equal(opens(md) - opens(TEMPLATE), 1); // only the non-conforming-subjects comment we add
  const closes = (s) => (s.match(/-->/g) ?? []).length;
  assert.equal(closes(md) - closes(TEMPLATE), 1);
  assert.ok(lines.some((l) => l.startsWith("| VCK-101 |") && l.includes("a \\| b \\| c")));
  const readme = read(root, "docs/releases/README.md");
  assert.equal(readme.split("\n").filter((l) => l.includes("RELEASE-1.2.3.md")).join(""), "| 1.2.3 | 2026-10-02 | Draft: fill in highlights | RELEASE-1.2.3.md |");
  const before = check(root);
  assert.equal(before.status, 1);
  assert.doesNotMatch(before.stderr, /index|README/i);
  writeFileSync(join(root, RELEASE), fill(md));
  const after = check(root);
  assert.equal(after.status, 0, after.stderr);
});

test("[VCK-008-AC2] a 500-char subject is capped at 200 chars plus an ellipsis", (t) => {
  const root = fresh(t, [`feat: ${"y".repeat(500)}`]);
  assert.equal(runRelease(root, ["1.2.3"]).code, 0);
  const row = read(root, RELEASE).split("\n").find((l) => l.includes("yyyy"));
  assert.match(row, /y{200}…/);
  assert.doesNotMatch(row, /y{201}/);
});

test("[VCK-008-AC2] a BREAKING CHANGE: footer in a commit body lands in Summary", (t) => {
  const root = fresh(t, [["feat: new api (VCK-103)", "why\n\nBREAKING CHANGE: old api gone"]]);
  assert.equal(runRelease(root, ["1.2.3"]).code, 0);
  const summary = sections(read(root, RELEASE), "## Summary")[0].join("\n");
  assert.match(summary, /^- BREAKING: .*new api/m);
});

test("[VCK-008-AC2] git is read as UTF-8 even when the repo sets a different log output encoding", (t) => {
  const root = fresh(t, ["feat: café au lait (VCK-104)"]);
  g(root, "config", "i18n.logOutputEncoding", "ISO-8859-1"); // untracked (.git/config): tree stays clean
  assert.equal(runRelease(root, ["1.2.3"]).code, 0);
  const md = read(root, RELEASE);
  assert.match(md, /café au lait/);
  assert.doesNotMatch(md, /�/);
});
