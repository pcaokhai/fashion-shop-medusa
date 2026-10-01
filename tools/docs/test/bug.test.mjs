/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync } from "node:fs";
import { checkBugs } from "../lib/bug.mjs";
import { bug, makeRoot, cleanup, baseFiles } from "./fixture.mjs";

const run = (files) => {
  const root = makeRoot(files);
  try {
    return checkBugs(root);
  } finally {
    cleanup(root);
  }
};
const withBug = (name, body) => ({ "docs/bugs/BUG-000-template.md": "t", [`docs/bugs/${name}`]: body });

test("[VCK-008-AC1] valid OPEN bug passes and is counted", () => {
  const r = run(baseFiles());
  assert.deepEqual(r.violations, []);
  assert.equal(r.count, 1);
});

test("[VCK-008-AC1] zero bug files passes explicitly with count 0", () => {
  const r = run({ "docs/bugs/BUG-000-template.md": "t" });
  assert.deepEqual(r.violations, []);
  assert.equal(r.count, 0);
});

test("[VCK-008-AC1] missing docs/bugs directory fails closed", () => {
  assert.equal(run({ "x": "y" }).violations.length, 1);
});

const bad = (label, name, body, re) =>
  test(`[VCK-008-AC1] ${label} fails`, () => {
    const v = run(withBug(name, body)).violations;
    assert.ok(v.length >= 1, "expected a violation");
    assert.ok(v.every((m) => m.startsWith(`docs/bugs/${name}: `)), v.join("\n"));
    assert.match(v.join("\n"), re);
  });

const N = "BUG-001-x.md";
bad("missing Severity", N, bug("001").replace("Severity: S2 · ", ""), /Severity/);
bad("Severity S9", N, bug("001", { sev: "S9" }), /Severity/);
bad("Severity placeholder", N, bug("001").replace("S2", "S1 | S2"), /Severity/);
bad("missing Status", N, bug("001").replace(" · Status: OPEN", ""), /Status/);
bad("unknown Status", N, bug("001", { status: "DONE" }), /Status/);
bad("CLOSED with placeholder root cause", N, bug("001", { status: "CLOSED", cause: "1. Why ..." }), /Root cause/);
bad("CLOSED with empty root cause", N, bug("001", { status: "CLOSED", cause: "" }), /Root cause/);
bad("CLOSED without token", N, bug("001", { status: "CLOSED", reg: "`a.test.mjs::it`" }), /BUG-001/);
bad("CLOSED with another bug's token", N, bug("001", { status: "CLOSED", reg: "`a::it [BUG-002]`" }), /BUG-001/);
bad("FIXED without root cause", N, bug("001", { status: "FIXED", cause: "" }), /Root cause/);
bad("FIXED without token", N, bug("001", { status: "FIXED", reg: "" }), /BUG-001/);
bad("VERIFIED without root cause", N, bug("001", { status: "VERIFIED", cause: "" }), /Root cause/);
bad("bad file name BUG-12-x.md", "BUG-12-x.md", bug("012"), /name/);
bad("bad file name BUG-001.md", "BUG-001.md", bug("001"), /name/);

test("[VCK-008-AC1] FIXED with root cause + own token passes; OPEN needs neither", () => {
  assert.deepEqual(run(withBug(N, bug("001", { status: "FIXED" }))).violations, []);
  assert.deepEqual(run(withBug(N, bug("001", { cause: "", reg: "" }))).violations, []);
});

test("[VCK-008-AC1] body number must match the file number heading-independent (token uses the file's)", () => {
  assert.equal(run(withBug("BUG-007-x.md", bug("007", { status: "CLOSED" }))).violations.length, 0);
});

test("[VCK-008-AC1] template is skipped by exact name only", () => {
  const r = run({ "docs/bugs/BUG-000-template.md": "garbage with no fields" });
  assert.deepEqual(r.violations, []);
  assert.equal(r.count, 0);
});

test("[VCK-008-AC1] unreadable bug (directory named BUG-001-x.md) fails closed", () => {
  const root = makeRoot({ "docs/bugs/BUG-000-template.md": "t", "docs/bugs/BUG-001-x.md/keep": "" });
  try {
    const v = checkBugs(root).violations;
    assert.equal(v.length, 1);
    assert.match(v[0], /^docs\/bugs\/BUG-001-x\.md: cannot read/);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] unreadable bug (chmod 000) fails closed", { skip: process.getuid?.() === 0 }, () => {
  const root = makeRoot(baseFiles());
  try {
    chmodSync(`${root}/docs/bugs/BUG-001-open.md`, 0);
    assert.match(checkBugs(root).violations.join(), /cannot read/);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] every violation is reported, across files", () => {
  const files = { ...withBug("BUG-001-a.md", bug("001", { sev: "S9" })), "docs/bugs/BUG-002-b.md": bug("002", { status: "NOPE" }), "docs/bugs/BUG-3-c.md": "x" };
  assert.equal(run(files).violations.length, 3);
});
