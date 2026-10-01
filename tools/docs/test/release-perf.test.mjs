/* global Buffer */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { cleanup } from "./fixture.mjs";
import { gitEnv, repoWith, runRelease } from "./release-fixture.mjs";

const COMMITS = 10_000;
const BUDGET_MS = 10_000;
const FILES = ["docs/releases/RELEASE-1.2.3.md", "docs/releases/README.md", "CHANGELOG.md"];

/** Appends COMMITS empty commits to main in one `git fast-import` run (seconds, not minutes). */
function addCommits(root) {
  const parts = [];
  for (let i = 0; i < COMMITS; i++) {
    const msg = `${["feat", "fix", "docs", "chore"][i % 4]}: change ${i} (VCK-${String(100 + (i % 800)).padStart(3, "0")})`;
    parts.push(`commit refs/heads/main\ncommitter t <t@t> ${1788000000 + i} +0000\ndata ${Buffer.byteLength(msg)}\n${msg}\n${i === 0 ? "from refs/heads/main^0\n" : ""}\n`);
  }
  const r = spawnSync("git", ["-C", root, "fast-import", "--quiet"], { input: parts.join(""), env: gitEnv(), encoding: "utf8", maxBuffer: 1 << 28 });
  assert.equal(r.status, 0, r.stderr);
}

test("[VCK-008-AC2] 10k commits release in under 10 s with deterministic output", (t) => {
  const root = repoWith([]);
  t.after(() => cleanup(root));
  addCommits(root);
  const run = () => {
    const start = Date.now();
    const r = runRelease(root, ["1.2.3"]);
    const ms = Date.now() - start;
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /\(10001 commits\)/);
    assert.ok(ms < BUDGET_MS, `took ${ms} ms`);
    return FILES.map((f) => readFileSync(join(root, f), "utf8"));
  };
  const first = run();
  spawnSync("git", ["-C", root, "checkout", "-q", "--", "."], { env: gitEnv() });
  spawnSync("git", ["-C", root, "clean", "-fdq"], { env: gitEnv() });
  assert.deepEqual(run(), first);
});
