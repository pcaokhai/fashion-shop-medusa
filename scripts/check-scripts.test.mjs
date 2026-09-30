import { test } from "node:test";
import assert from "node:assert/strict";
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
