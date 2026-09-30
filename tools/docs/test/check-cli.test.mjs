import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { bug, progress, makeRoot, cleanup, baseFiles, runCheck } from "./fixture.mjs";

test("[VCK-008-AC1] passing tree exits 0 with a one-line count", () => {
  const root = makeRoot(baseFiles());
  try {
    const r = runCheck(root);
    assert.equal(r.code, 0, r.out);
    assert.equal(r.out.trim().split("\n").length, 1);
    assert.match(r.out, /1 bug file/);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] every violation is printed as path: message; exit 1", () => {
  const f = baseFiles();
  f["docs/bugs/BUG-002-x.md"] = bug("002", { sev: "S9" });
  f["docs/bugs/BUG-3-y.md"] = "x";
  f["docs/progress/PROGRESS.md"] = progress(16);
  const root = makeRoot(f);
  try {
    const r = runCheck(root);
    assert.equal(r.code, 1);
    const errs = r.out.split("\n").filter((l) => /^docs\/.*: /.test(l));
    assert.equal(errs.length, 3, r.out);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] fails closed on an empty root (no docs at all)", () => {
  const root = makeRoot({ x: "y" });
  try {
    const r = runCheck(root);
    assert.equal(r.code, 1);
    assert.match(r.out, /docs\/bugs: /);
    assert.match(r.out, /PROGRESS\.md: /);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] VCK_ROOT pointing at a nonexistent dir fails", () => {
  assert.equal(runCheck("/nonexistent-vck-root").code, 1);
});

test("[VCK-008-AC1][VCK-008-AC3] mutation: each single-field edit of a passing fixture flips the exit code", () => {
  const closed = bug("001", { status: "CLOSED" });
  const base = () => ({ ...baseFiles(), "docs/bugs/BUG-001-open.md": closed });
  const mutations = {
    "drop Severity": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace("Severity: S2 · ", "")),
    "Severity S9": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace("S2", "S9")),
    "drop Status": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace(" · Status: CLOSED", "")),
    "unknown Status": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace("CLOSED", "DONE")),
    "placeholder root cause": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace("1. Why did it break? Because X.", "1. Why ...")),
    "foreign token": (f) => (f["docs/bugs/BUG-001-open.md"] = closed.replace("[BUG-001]", "[BUG-002]")),
    "rename to bad name": (f) => {
      f["docs/bugs/BUG-01-open.md"] = closed;
      delete f["docs/bugs/BUG-001-open.md"];
    },
    "Now 16 lines": (f) => (f["docs/progress/PROGRESS.md"] = progress(16)),
    "drop Now heading": (f) => (f["docs/progress/PROGRESS.md"] = progress().replace("## Now", "## Soon")),
  };
  const ok = makeRoot(base());
  try {
    assert.equal(runCheck(ok).code, 0, "unmutated fixture must pass");
    writeFileSync(`${ok}/docs/progress/PROGRESS.md`, progress(15));
    assert.equal(runCheck(ok).code, 0, "boundary (15) must pass");
    rmSync(`${ok}/docs/progress/PROGRESS.md`);
    assert.equal(runCheck(ok).code, 1, "deleting PROGRESS must fail");
  } finally {
    cleanup(ok);
  }
  for (const [name, mutate] of Object.entries(mutations)) {
    const f = base();
    mutate(f);
    const root = makeRoot(f);
    try {
      assert.equal(runCheck(root).code, 1, `mutation "${name}" must fail`);
    } finally {
      cleanup(root);
    }
  }
});
