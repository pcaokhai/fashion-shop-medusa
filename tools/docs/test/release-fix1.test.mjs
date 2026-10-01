/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, lstatSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanup } from "./fixture.mjs";
import { main } from "../release.mjs";
import { readCommits } from "../lib/git.mjs";
import { FIXED_DATE, g, repoWith, runRelease, snapshot } from "./release-fixture.mjs";

const noop = () => {};
const ENV = (root) => ({ VCK_ROOT: root, VCK_DATE: FIXED_DATE });

// 1. delimiter forgery: git messages cannot contain NUL, but may contain \x1e / \x1f
for (const [name, subs] of [
  ["\\x1e in body", [["feat: real", "body\x1e\nfeat: FORGED"]]],
  ["\\x1f in body", [["feat: real", "body\x1f\nfeat: FORGED"]]],
  ["\\x1e in subject", [["fix: sub\x1e\nfeat: FORGED2", "b"]]],
  ["\\x1f in subject", [["fix: sub\x1f feat: FORGED2", "b"]]],
  ["both in both", [["fix: a\x1e\x1fb", "x\x1f\x1e\x1e\nfeat: F"], "feat: second"]],
]) {
  test(`[VCK-008-AC2] readCommits cannot be forged: ${name}`, (t) => {
    const root = repoWith(subs);
    t.after(() => cleanup(root));
    const { commits } = readCommits(root, null);
    assert.equal(commits.length, subs.length + 1);
    assert.equal(commits[0].subject, "chore: init");
    assert.ok(commits.every((c) => !/^feat: FORGED/.test(c.subject)));
    const first = Array.isArray(subs[0]) ? subs[0] : [subs[0]];
    assert.ok(commits[1].subject.startsWith(first[0].split(/[^ -~]/)[0]));
    assert.ok(commits[1].body === "" || first[1] !== undefined);
    if (first[1]?.includes("\x1e")) assert.ok(commits[1].body.includes("\x1e"));
  });
}

// 2 + 6. wx guard: a stale foreign temp file survives and is named
test("[VCK-008-AC2] a stale gitignored .vck-tmp survives, nothing else changes, message names the path", (t) => {
  const root = repoWith(["feat: a"], { files: { ".gitignore": "*.vck-tmp\n", "CHANGELOG.md.vck-tmp": "foreign" } });
  t.after(() => cleanup(root));
  const before = snapshot(root);
  const r = runRelease(root, ["1.2.3"]);
  assert.equal(r.code, 1);
  assert.match(r.err, /CHANGELOG\.md\.vck-tmp/);
  assert.match(r.err, /EEXIST/);
  assert.equal(readFileSync(join(root, "CHANGELOG.md.vck-tmp"), "utf8"), "foreign");
  assert.equal(snapshot(root), before);
});

// 3. symlinks
for (const f of ["docs/releases/README.md", "CHANGELOG.md"]) {
  test(`[VCK-008-AC2] refuses a symlinked ${f}`, (t) => {
    const root = repoWith(["feat: a"]);
    t.after(() => cleanup(root));
    const body = readFileSync(join(root, f), "utf8");
    writeFileSync(join(root, "real.txt"), body);
    unlinkSync(join(root, f));
    symlinkSync(join(root, "real.txt"), join(root, f));
    g(root, "add", "-A");
    g(root, "commit", "-q", "-m", "chore: link");
    const before = snapshot(root);
    const r = runRelease(root, ["1.2.3"]);
    assert.equal(r.code, 1);
    assert.match(r.err, new RegExp(`${f.replace(/\./g, "\\.")}.*symlink`));
    assert.equal(snapshot(root), before);
  });
}

// 4. modes survive umask
test("[VCK-008-AC2] file modes are preserved under umask 077 (executable bit kept, new file 0644)", (t) => {
  const root = repoWith(["feat: a"]);
  t.after(() => cleanup(root));
  chmodSync(join(root, "CHANGELOG.md"), 0o755);
  g(root, "commit", "-q", "-am", "chore: exec");
  const old = process.umask(0o077);
  t.after(() => process.umask(old));
  assert.equal(main(ENV(root), ["1.2.3"], { log: noop, error: noop }), 0);
  const mode = (p) => lstatSync(join(root, p)).mode & 0o777;
  assert.equal(mode("CHANGELOG.md"), 0o755);
  assert.equal(mode("docs/releases/README.md"), 0o644);
  assert.equal(mode("docs/releases/RELEASE-1.2.3.md"), 0o644);
});

// 5. date
test("[VCK-008-AC2] VCK_DATE=2026-13-01 says invalid VCK_DATE", (t) => {
  const root = repoWith(["feat: a"]);
  t.after(() => cleanup(root));
  const r = runRelease(root, ["1.2.3"], { VCK_DATE: "2026-13-01" });
  assert.equal(r.code, 1);
  assert.match(r.err, /invalid VCK_DATE/);
  assert.doesNotMatch(r.err, /unexpected/);
});

// 6. leftovers
test("[VCK-008-AC2] write failure names the path; undeletable temp is listed with recovery advice", (t) => {
  const root = repoWith(["feat: a"]);
  t.after(() => cleanup(root));
  let n = 0;
  const ops = {
    writeFileSync: (...a) => {
      if (++n === 3) throw Object.assign(new Error("x"), { code: "ENOSPC" });
      return writeFileSync(...a);
    },
    chmodSync,
    renameSync,
    rmSync: (p, o) => {
      if (String(p).endsWith("README.md.vck-tmp")) throw Object.assign(new Error("x"), { code: "EPERM" });
      return rmSync(p, o);
    },
  };
  const err = [];
  assert.equal(main(ENV(root), ["1.2.3"], { log: noop, error: (m) => err.push(m) }, ops), 1);
  const msg = err.join("\n");
  assert.match(msg, /CHANGELOG\.md\.vck-tmp.*ENOSPC|ENOSPC.*CHANGELOG\.md\.vck-tmp/);
  assert.match(msg, /README\.md\.vck-tmp/);
  assert.match(msg, /git checkout/);
  assert.ok(existsSync(join(root, "docs/releases/README.md.vck-tmp")));
});

test("[VCK-008-AC2] rename failure with failed restore names paths and advises git checkout", (t) => {
  const root = repoWith(["feat: a"]);
  t.after(() => cleanup(root));
  let r = 0;
  const ops = {
    writeFileSync: (p, ...a) => {
      if (String(p).endsWith("README.md")) throw Object.assign(new Error("x"), { code: "EIO" });
      return writeFileSync(p, ...a);
    },
    renameSync: (a, b) => {
      if (++r === 3) throw Object.assign(new Error("x"), { code: "EXDEV" });
      return renameSync(a, b);
    },
    chmodSync,
    rmSync,
  };
  const err = [];
  assert.equal(main(ENV(root), ["1.2.3"], { log: noop, error: (m) => err.push(m) }, ops), 1);
  assert.match(err.join("\n"), /README\.md.*git checkout|git checkout.*README\.md/);
});

// 7. git env pinning
test("[VCK-008-AC2] hostile inherited GIT_CONFIG_COUNT/KEY/VALUE cannot hide an untracked file", (t) => {
  const root = repoWith(["feat: a"]);
  t.after(() => cleanup(root));
  const ex = join(tmpdir(), `vck-excl-${process.pid}`);
  writeFileSync(ex, "*\n");
  t.after(() => rmSync(ex, { force: true }));
  writeFileSync(join(root, "new.txt"), "x");
  const r = runRelease(root, ["1.2.3"], { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.excludesFile", GIT_CONFIG_VALUE_0: ex });
  assert.equal(r.code, 1);
  assert.match(r.err, /working tree is not clean/);
});
