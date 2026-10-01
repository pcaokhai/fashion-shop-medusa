/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup } from "./fixture.mjs";
import { main } from "../release.mjs";
import { docsFiles, g, repoWith, runRelease, snapshot, tmp, writeFiles, FIXED_DATE } from "./release-fixture.mjs";

const OK = ["feat: a (VCK-001)"];
const CL = (extra = "") => `# Changelog\n\n## [Unreleased]\n- x\n${extra}`;
const CS = '---\n"@vck/p": patch\n---\n\nsummary\n';
const noop = () => {};

/** name, how to build the root, args/env overrides, reason the refusal must print. */
const CASES = [
  ["dirty tracked file", { setup: (r) => writeFileSync(join(r, "CHANGELOG.md"), "# changed\n") }, /working tree is not clean/],
  ["untracked file", { setup: (r) => writeFileSync(join(r, "new.txt"), "x") }, /working tree is not clean/],
  ["detached HEAD", { setup: (r) => g(r, "checkout", "-q", "--detach") }, /detached HEAD/],
  ["existing tag v1.2.3", { tags: { "v1.2.3": 0 } }, /tag v1\.2\.3 already exists/],
  ["tag vfoo", { tags: { vfoo: 0 } }, /last tag .vfoo. is not vMAJOR/],
  ["tag v1.02.3", { tags: { "v1.02.3": 0 } }, /last tag .v1\.02\.3. is not vMAJOR/],
  ["existing RELEASE file", { files: { "docs/releases/RELEASE-1.2.3.md": "x\n" } }, /RELEASE-1\.2\.3\.md already exists/],
  ["existing CHANGELOG entry", { files: { "CHANGELOG.md": CL("\n## [1.2.3] - 2026-01-01\n- y\n") } }, /already has 1\.2\.3/],
  ["empty range and no changesets", { tags: { "v0.1.0": 1 } }, /nothing to release/],
  ["empty CHANGELOG", { files: { "CHANGELOG.md": "" } }, /CHANGELOG\.md.*empty/],
  ["CHANGELOG without Unreleased", { files: { "CHANGELOG.md": "# Changelog\n" } }, /Unreleased/],
  ["missing template", { files: { "docs/releases/RELEASE-template.md": null } }, /RELEASE-template\.md.*ENOENT/],
  ["zero-section template", { files: { "docs/releases/RELEASE-template.md": "# Release\nnothing\n" } }, /no '## ' sections/],
  ["README without the table", { files: { "docs/releases/README.md": "# Releases\n" } }, /Version \| Date/],
  ["invalid changeset", { files: { ".changeset/bad.md": "nope" } }, /bad\.md/],
  ["bad VCK_DATE 2026-02-30", { env: { VCK_DATE: "2026-02-30" } }, /invalid VCK_DATE/],
  ["bad VCK_DATE 20261002", { env: { VCK_DATE: "20261002" } }, /invalid VCK_DATE/],
  ["empty VCK_DATE", { env: { VCK_DATE: "" } }, /invalid VCK_DATE/],
  ["empty VCK_ROOT", { env: { VCK_ROOT: "" } }, /VCK_ROOT is set but empty/],
  ["no VERSION", { args: [] }, /usage/],
  ...["1.2", "v1.2.3", "01.2.3", "", "1.2.3 ", "1.2.3; rm -rf /", "1.2.3\n"].map((v) => [`bad VERSION ${JSON.stringify(v)}`, { args: [v] }, /invalid VERSION/]),
];

for (const [name, o, reason] of CASES) {
  test(`[VCK-008-AC2] refuses: ${name}; every file byte-identical`, (t) => {
    const root = repoWith(OK, { tags: o.tags, files: o.files });
    t.after(() => cleanup(root));
    o.setup?.(root);
    const before = snapshot(root);
    const head = g(root, "rev-parse", "HEAD");
    const r = runRelease(root, o.args ?? ["1.2.3"], o.env);
    assert.equal(r.code, 1, r.out);
    assert.match(r.err, /^release: /m);
    assert.match(r.err, reason);
    assert.equal(r.out, "");
    assert.equal(snapshot(root), before);
    assert.equal(g(root, "rev-parse", "HEAD"), head);
  });
}

test("[VCK-008-AC2] refuses a shallow clone", (t) => {
  const src = repoWith(["feat: a", "feat: b", "feat: c"]);
  const dir = tmp();
  t.after(() => (cleanup(src), cleanup(dir)));
  g(dir, "clone", "-q", "--depth", "1", `file://${src}`, "c");
  const root = join(dir, "c");
  const before = snapshot(root);
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /shallow/);
  assert.equal(snapshot(root), before);
});

test("[VCK-008-AC2] refuses a directory that is not a git repository", (t) => {
  const root = tmp();
  t.after(() => cleanup(root));
  writeFiles(root, docsFiles());
  const before = snapshot(root);
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /^release: .*git repository/m);
  assert.equal(snapshot(root), before);
});

test("[VCK-008-AC2] refuses a VCK_ROOT that is only a subdirectory of a repository", (t) => {
  const root = repoWith(OK, { files: { "sub/keep": "x" } });
  t.after(() => cleanup(root));
  const r = runRelease(join(root, "sub"), ["1.2.3"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /not the repository root/);
});

test("[VCK-008-AC2] read-only docs/releases fails before any rename", { skip: process.getuid?.() === 0 && "root ignores chmod" }, (t) => {
  const root = repoWith(OK);
  const dir = join(root, "docs/releases");
  t.after(() => (chmodSync(dir, 0o755), cleanup(root)));
  chmodSync(dir, 0o555);
  const before = snapshot(root);
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /^release: /m);
  assert.equal(snapshot(root), before);
});

/** In-process run with a failing fs seam: `fail(op, n)` returns true to throw on the n-th call of that op. */
function failing(fail) {
  const calls = { writeFileSync: 0, renameSync: 0 };
  const wrap = (op, real) => (...a) => {
    if (fail(op, ++calls[op])) throw Object.assign(new Error("injected"), { code: "EIO" });
    return real(...a);
  };
  return { writeFileSync: wrap("writeFileSync", writeFileSync), renameSync: wrap("renameSync", renameSync), chmodSync, rmSync };
}

for (const [name, op, n] of [["third temp write", "writeFileSync", 3], ["first rename", "renameSync", 1], ["second rename", "renameSync", 2], ["third rename", "renameSync", 3]]) {
  test(`[VCK-008-AC2] atomic: a failing ${name} restores everything and leaves no temp files`, (t) => {
    const root = repoWith(OK);
    t.after(() => cleanup(root));
    const before = snapshot(root);
    const err = [];
    const ops = failing((o, i) => o === op && i === n);
    const code = main({ VCK_ROOT: root, VCK_DATE: FIXED_DATE }, ["1.2.3"], { log: noop, error: (m) => err.push(m) }, ops);
    assert.equal(code, 1);
    assert.match(err.join("\n"), /^release: .*EIO/);
    assert.equal(snapshot(root), before);
    assert.equal(g(root, "status", "--porcelain", "--untracked-files=all"), "");
  });
}

test("[VCK-008-AC2] atomic seam sanity: without injected failures the same in-process run succeeds", (t) => {
  const root = repoWith(OK, { files: { ".changeset/a.md": CS } });
  t.after(() => cleanup(root));
  const code = main({ VCK_ROOT: root, VCK_DATE: FIXED_DATE }, ["1.2.3"], { log: noop, error: noop });
  assert.equal(code, 0);
});
