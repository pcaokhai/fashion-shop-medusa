import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPrTitle } from "./check-pr-title.mjs";
import { checkLicences } from "./check-licenses.mjs";

test("[VCK-003-AC3] accepts conventional titles with a story suffix", () => {
  for (const t of ["feat(infra): x (VCK-003)", "fix: y (VCK-104)", "chore(repo)!: z (VCK-001)"]) {
    assert.equal(checkPrTitle(t).ok, true, t);
  }
});

test("[VCK-003-AC3] rejects malformed titles with a reason", () => {
  for (const t of ["feat: x", "feat: x (VCK-3)", "wip: x (VCK-003)", "feat: x (vck-003)", "feat:  (VCK-003)", "feat: (VCK-003)"]) {
    const r = checkPrTitle(t);
    assert.equal(r.ok, false, t);
    assert.ok(r.reason, t);
  }
});

const allow = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "CC0-1.0", "BlueOak-1.0.0"];
const pkg = (name) => ({ name, versions: ["1.0.0"] });
const run = (licence, name = "p", exceptions = []) => checkLicences({ [licence]: [pkg(name)] }, allow, exceptions);

test("[VCK-003-AC2] passes an all-allowed list", () => {
  const r = checkLicences({ MIT: [pkg("a")], "Apache-2.0": [pkg("b")] }, allow, []);
  assert.deepEqual(r, { ok: true, offenders: [] });
});

test("[VCK-003-AC2] fails GPL, AGPL, unknown and missing licences", () => {
  for (const l of ["GPL-3.0", "AGPL-3.0", "Unknown", ""]) {
    const r = run(l);
    assert.equal(r.ok, false, l);
    assert.equal(r.offenders.length, 1, l);
  }
});

test("[VCK-003-AC2] a GPL package with a reasoned exception passes; without reason fails", () => {
  assert.equal(run("GPL-3.0", "g", [{ package: "g", licence: "GPL-3.0", reason: "dev tool only" }]).ok, true);
  for (const reason of [undefined, "", "  "]) {
    const r = run("GPL-3.0", "g", [{ package: "g", licence: "GPL-3.0", reason }]);
    assert.equal(r.ok, false);
    assert.ok(r.offenders.some((o) => /reason/.test(o)));
  }
});

test("[VCK-003-AC2] SPDX OR passes if any alternative is allowed; AND needs all", () => {
  assert.equal(run("(MIT OR GPL-3.0)").ok, true);
  assert.equal(run("(GPL-3.0 OR AGPL-3.0)").ok, false);
  assert.equal(run("(MIT AND Apache-2.0)").ok, true);
  assert.equal(run("(MIT AND GPL-3.0)").ok, false);
  assert.equal(run("MIT OR (GPL-3.0 AND ISC)").ok, true);
});

test("[VCK-003-AC2] exceptions match package AND licence; invalid entries fail", () => {
  const ex = { package: "g", licence: "GPL-3.0", reason: "dev tool only" };
  assert.equal(run("AGPL-3.0", "g", [ex]).ok, false);
  assert.equal(run("GPL-3.0", "other", [ex]).ok, false);
  for (const bad of [{ licence: "GPL-3.0", reason: "r" }, { package: "g", reason: "r" }, { package: "g", licence: "GPL-3.0" }]) {
    assert.equal(run("MIT", "g", [bad]).ok, false);
  }
});

test("[VCK-003-AC2] malformed or unsupported SPDX expressions fail closed", () => {
  for (const l of ["MIT OR", "MIT OR )", "(MIT", "MIT)", "MIT WITH x", "MIT+", "UNLICENSED", "SEE LICENSE IN x", "mit", "MIT or GPL-3.0"]) {
    assert.equal(run(l).ok, false, l);
  }
  assert.equal(run("(MIT OR Apache-2.0)").ok, true);
  assert.equal(run("GPL-3.0 AND MIT OR ISC").ok, true); // (GPL AND MIT) OR ISC
  assert.equal(run("GPL-3.0 AND MIT OR AGPL-3.0").ok, false);
  assert.equal(run("MIT OR GPL-3.0 AND AGPL-3.0").ok, true);
});

test("[VCK-003-AC2] checkLicences throws on null/undefined input", () => {
  assert.throws(() => checkLicences(null, allow, []));
  assert.throws(() => checkLicences(undefined, allow, []));
});

test("[VCK-003-AC3] rejects trailing newline and multi-line titles", () => {
  assert.equal(checkPrTitle("feat: x (VCK-003)\n").ok, false);
  assert.equal(checkPrTitle("bad\nfeat: x (VCK-003)").ok, false);
});

const dir = mkdtempSync(join(tmpdir(), "vck-cli-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const cli = (file, args, input) => {
  const link = join(dir, `link-${file}`);
  if (!existsSync(link)) symlinkSync(fileURLToPath(new URL(file, import.meta.url)), link);
  return [file, link].map((f) => spawnSync("node", [f === file ? fileURLToPath(new URL(file, import.meta.url)) : f, ...args], { input, encoding: "utf8" }));
};
const statuses = (file, args, input) => cli(file, args, input).map((r) => r.status);

test("[VCK-003-AC3] title CLI exit codes, also via symlink", () => {
  assert.deepEqual(statuses("check-pr-title.mjs", ["feat: x (VCK-003)"]), [0, 0]);
  assert.deepEqual(statuses("check-pr-title.mjs", ["bad title"]), [1, 1]);
  assert.deepEqual(statuses("check-pr-title.mjs", []), [1, 1]);
});

test("[VCK-003-AC2] licence CLI fails closed, also via symlink", () => {
  const f = "check-licenses.mjs";
  assert.deepEqual(statuses(f, [], '{"MIT":[{"name":"a","versions":["1"]}]}'), [0, 0]);
  assert.deepEqual(statuses(f, [], '{"GPL-3.0":[{"name":"a","versions":["1"]}]}'), [1, 1]);
  assert.deepEqual(statuses(f, [], "No licenses in packages found\n"), [0, 0]);
  for (const bad of ["", "garbage", '{"MIT":[', "[]", "null", '{"error":{"code":"X"}}', '{"MIT":"x"}', '{"MIT":[{"versions":[]}]}', "ERR_PNPM_FETCH failed"]) {
    assert.deepEqual(statuses(f, [], bad), [1, 1], JSON.stringify(bad));
  }
});

test("[VCK-003-AC3] rejects blank or whitespace-only descriptions", () => {
  for (const t of ["feat:   (VCK-003)", "feat: \t (VCK-003)", "feat:  (VCK-003)"]) assert.equal(checkPrTitle(t).ok, false, JSON.stringify(t));
  assert.equal(checkPrTitle("feat: real thing (VCK-003)").ok, true);
});
