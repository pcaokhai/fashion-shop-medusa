/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cleanup } from "./fixture.mjs";
import { requiredSections } from "../lib/release-doc.mjs";
import { sections, trimBlank } from "../lib/sections.mjs";
import { CHECK_CLI, FIXED_DATE, REPO_ROOT, TEMPLATE, addMerge, g, repoWith, runRelease, tmp } from "./release-fixture.mjs";

const SUBJECTS = [
  "feat: add cart (VCK-101) (#5)",
  ["fix: totals (VCK-102)", "Closes BUG-007"],
  "docs: a",
  "docs: b",
  "docs: c",
  "chore: x",
  "refactor: tidy",
  "wip stuff <b>",
];
const RELEASE = "docs/releases/RELEASE-1.2.3.md";
const read = (root, rel) => readFileSync(join(root, rel), "utf8");
const status = (root) => g(root, "status", "--porcelain", "--untracked-files=all").split("\n").filter(Boolean).sort();
const fresh = (t, ...args) => {
  const root = repoWith(...args);
  t.after(() => cleanup(root));
  return root;
};

test("[VCK-008-AC2] no tag: whole history, only the three files change, nothing committed or tagged", (t) => {
  const root = fresh(t, SUBJECTS);
  addMerge(root);
  const head = g(root, "rev-parse", "HEAD");
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 0, r.err);
  assert.equal(g(root, "rev-parse", "HEAD"), head);
  assert.equal(g(root, "tag", "-l"), "");
  assert.deepEqual(status(root), [" M CHANGELOG.md", " M docs/releases/README.md", `?? ${RELEASE}`]);
  assert.match(r.out, /no v\* tag: first release, range = entire history \(10 commits\)/);
  assert.match(r.out, /omitted: docs 3, chore 2/);
  assert.match(r.out, /skipped merge commits: 1/);
  assert.match(r.out, /non-conforming subjects \(1\):\n {2}- wip stuff &lt;b&gt;/);
  assert.match(r.out, /nothing committed or tagged/);
  for (const p of [RELEASE, "docs/releases/README.md", "CHANGELOG.md"]) assert.ok(r.out.includes(p), p);
  assert.match(r.out, /CHANGELOG `## \[Unreleased\]` content is NOT moved/);
  assert.match(r.out, /\.changeset\/ files are NOT deleted/);
  assert.match(r.out, /DRAFT: `make docs-check` fails until Summary, Integration changes, Migrations, Metrics, Known issues, Upgrade and rollback, Demo are edited \(write `None\.` if nothing applies\)/);
  const rel = read(root, RELEASE);
  assert.ok(rel.includes("| VCK-101 | add cart (#5) | — |"));
  assert.ok(rel.includes("| BUG-007 | — | totals |"));
  assert.ok(rel.includes("Date: 2026-10-02 · Tag: v1.2.3"));
  assert.ok(rel.includes("wip stuff &lt;b&gt;"));
  const log = read(root, "CHANGELOG.md");
  assert.ok(log.indexOf("## [Unreleased]") < log.indexOf("## [1.2.3] - 2026-10-02"));
  assert.ok(log.indexOf("## [1.2.3]") < log.indexOf("## [Initial]"));
  assert.ok(log.includes("- Keep me.\n"));
  assert.match(log, /### Added\n- add cart \(VCK-101\) \(#5\)\n/);
  assert.match(log, /### Fixed\n- totals \(VCK-102\)\n/);
  assert.match(log, /### Changed\n- tidy\n/);
  assert.match(read(root, "docs/releases/README.md"), /\n\| 1\.2\.3 \| 2026-10-02 \| Draft: fill in highlights \| RELEASE-1\.2\.3\.md \|\n$/);
});

test("[VCK-008-AC2] with a v0.1.0 tag only later commits are used", (t) => {
  const root = fresh(t, ["feat: old one (VCK-001)", "feat: new one (VCK-002)"], { tags: { "v0.1.0": 1 } });
  const r = runRelease(root, ["0.2.0"]);
  assert.equal(r.code, 0, r.err);
  assert.ok(!r.out.includes("first release"));
  assert.match(r.out, /range v0\.1\.0\.\.HEAD \(1 commits\)/);
  const rel = read(root, "docs/releases/RELEASE-0.2.0.md");
  assert.ok(rel.includes("new one") && !rel.includes("old one"));
});

test("[VCK-008-AC2] changesets are listed under Changed; major ones are BREAKING", (t) => {
  const cs = (b) => `---\n"@vck/pkg": ${b}\n---\n\nChanged the thing\n`;
  const root = fresh(t, [], { files: { ".changeset/a.md": cs("major"), ".changeset/README.md": "ignored" } });
  const r = runRelease(root, ["1.0.0"]);
  assert.equal(r.code, 0, r.err);
  assert.ok(read(root, "CHANGELOG.md").includes("### Changed\n- BREAKING: Changed the thing (@vck/pkg)\n"));
  assert.ok(read(root, "docs/releases/RELEASE-1.0.0.md").includes("- BREAKING: Changed the thing"));
  assert.match(r.out, /Summary/);
});

test("[VCK-008-AC2] a missing VCK_DATE means today (UTC)", (t) => {
  const root = fresh(t, ["feat: a"]);
  const r = runRelease(root, ["1.2.3"], { VCK_DATE: undefined });
  assert.equal(r.code, 0, r.err);
  assert.ok(read(root, "CHANGELOG.md").includes(`## [1.2.3] - ${new Date().toISOString().slice(0, 10)}`));
});

/** Replaces the body of every section still equal to the template's with `None.`. */
function fillSections(root, rel) {
  const heads = requiredSections(TEMPLATE);
  const norm = (lines) => trimBlank(lines.map((l) => l.trimEnd())).join("\n");
  let md = read(root, rel);
  for (const h of heads) {
    if (norm(sections(md, h)[0]) === norm(sections(TEMPLATE, h)[0])) md = md.replace(`${h}\n${sections(md, h)[0].join("\n")}`, `${h}\nNone.\n`);
  }
  return md;
}

test("[VCK-008-AC2] the draft fails docs-check until its untouched sections are edited, then passes", (t) => {
  const root = fresh(t, ["feat: a (VCK-001)", "fix: b"]);
  assert.equal(runRelease(root, ["1.2.3"]).code, 0);
  const check = () => spawnSync(process.execPath, [CHECK_CLI], { env: { ...process.env, VCK_ROOT: root }, encoding: "utf8" });
  const before = check();
  assert.equal(before.status, 1);
  assert.match(before.stderr, /still the template placeholder/);
  const edited = fillSections(root, RELEASE);
  assert.ok(!/<2–3 sentences|<clip links>/.test(edited));
  writeFileSync(join(root, RELEASE), edited);
  const after = check();
  assert.equal(after.status, 0, after.stderr);
});

test("[VCK-008-AC2] two runs on identical repos write byte-identical files", (t) => {
  const a = fresh(t, SUBJECTS);
  const b = fresh(t, SUBJECTS);
  assert.equal(runRelease(a, ["1.2.3"]).code, 0);
  assert.equal(runRelease(b, ["1.2.3"]).code, 0);
  for (const p of [RELEASE, "docs/releases/README.md", "CHANGELOG.md"]) assert.equal(read(a, p), read(b, p), p);
});

test("[VCK-008-AC2] a run leaves no stray temp files in the repo", (t) => {
  const root = fresh(t, ["feat: a"]);
  assert.equal(runRelease(root, ["1.2.3"]).code, 0);
  assert.equal(g(root, "status", "--porcelain", "--untracked-files=all", "--ignored").split("\n").filter((l) => l.includes(".vck-tmp")).length, 0);
});

test("[VCK-008-AC2] make release: usage without VERSION, hostile VERSION cannot inject", (t) => {
  // Never the real checkout: VERSION is dropped from the inherited env and VCK_ROOT points at a fixture repo.
  const fx = fresh(t, ["feat: a"]);
  const env = { ...process.env, VCK_DATE: FIXED_DATE, VCK_ROOT: fx };
  delete env.VERSION;
  const mk = (...a) => spawnSync("make", ["-s", "-C", REPO_ROOT, "release", ...a], { encoding: "utf8", env });
  const none = mk();
  assert.ok(none.status > 0); // make itself reports 2 for a failed recipe
  assert.match(`${none.stdout}${none.stderr}`, /usage: make release VERSION=x\.y\.z/);
  const dir = tmp();
  t.after(() => cleanup(dir));
  const marker = join(dir, "pwned");
  for (const v of [`1.2.3; touch ${marker}`, `1.2.3" ; touch ${marker} ; "`, `$(touch ${marker})`, "`touch " + marker + "`"]) {
    const r = mk(`VERSION=${v}`);
    assert.ok(r.status > 0, v);
    assert.match(`${r.stdout}${r.stderr}`, /^release: |^usage: make release/m); // make may expand $(...) itself to an empty VERSION
    assert.ok(!existsSync(marker), `injected: ${v}`);
  }
});

test("[VCK-008-AC2] real repo: a clone drafts 0.1.0 (working tree untouched)", (t) => {
  if (g(REPO_ROOT, "rev-parse", "--is-shallow-repository").trim() === "true") return t.skip("shallow checkout");
  const dir = tmp();
  t.after(() => cleanup(dir));
  const root = join(dir, "clone");
  g(dir, "clone", "-q", "--no-hardlinks", REPO_ROOT, "clone");
  g(root, "checkout", "-q", "-B", "release-dry"); // CI checks out a detached HEAD; so does the clone
  const r = runRelease(root, ["0.1.0"]);
  assert.equal(r.code, 0, r.err);
  for (const p of ["docs/releases/RELEASE-0.1.0.md", "docs/releases/README.md", "CHANGELOG.md"]) assert.ok(r.out.includes(p));
  assert.ok(existsSync(join(root, "docs/releases/RELEASE-0.1.0.md")));
  assert.ok(!existsSync(join(REPO_ROOT, "docs/releases/RELEASE-0.1.0.md")));
  if (process.env.VCK_SHOW) process.stdout.write(r.out);
});
