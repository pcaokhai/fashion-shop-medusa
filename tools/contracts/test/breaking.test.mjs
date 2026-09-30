/* global URL, process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../breaking.mjs";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const cli = fileURLToPath(new URL("../breaking.mjs", import.meta.url));
const ADR = "See docs/adr/ADR-014-guest-order-access.md for the decision.";
const L = "contract-breaking";

test("[VCK-004-AC2] not breaking is ok regardless of labels/body", () => {
  assert.equal(decide({ breaking: false, labels: [], body: "", adrExists: false }).ok, true);
});
test("[VCK-004-AC2] breaking without label fails", () => {
  assert.equal(decide({ breaking: true, labels: [], body: ADR, adrExists: true }).ok, false);
});
test("[VCK-004-AC2] label but no ADR link fails", () => {
  assert.equal(decide({ breaking: true, labels: [L], body: "no link", adrExists: false }).ok, false);
});
test("[VCK-004-AC2] ADR link but no label fails", () => {
  const r = decide({ breaking: true, labels: ["bug"], body: ADR, adrExists: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /contract-breaking/);
});
test("[VCK-004-AC2] label and existing ADR is ok", () => {
  assert.equal(decide({ breaking: true, labels: [L], body: ADR, adrExists: true }).ok, true);
});
test("[VCK-004-AC2] label is case-sensitive and exact", () => {
  for (const l of ["Contract-Breaking", "contract-breaking ", "contract-breaking-x"]) {
    assert.equal(decide({ breaking: true, labels: [l], body: ADR, adrExists: true }).ok, false, l);
  }
});
test("[VCK-004-AC2] made-up ADR (file absent) fails", () => {
  assert.equal(decide({ breaking: true, labels: [L], body: "docs/adr/ADR-999-nope.md", adrExists: false }).ok, false);
});
test("[VCK-004-AC2] path traversal is not an ADR link", () => {
  for (const b of ["docs/adr/../../etc/passwd", "docs/adr/ADR-014/../../x.md", "docs/adr/../ADR-014.md"]) {
    assert.equal(decide({ breaking: true, labels: [L], body: b, adrExists: true }).ok, false, b);
  }
});
test("[VCK-004-AC2] ADR-000 template is not a valid ADR link", () => {
  assert.equal(decide({ breaking: true, labels: [L], body: "docs/adr/ADR-000-template.md", adrExists: true }).ok, false);
  assert.equal(decide({ breaking: true, labels: [L], body: "docs/adr/ADR-000-template.md " + ADR, adrExists: true }).ok, true);
});
test("[VCK-004-AC2] 100 kB and unicode bodies are handled fast", () => {
  const t = Date.now();
  const big = "docs/adr/ADR-01".repeat(6000) + "\u{1F4A9}\u0000é".repeat(5000);
  assert.equal(decide({ breaking: true, labels: [L], body: big, adrExists: true }).ok, false);
  assert.equal(decide({ breaking: true, labels: [L], body: big + ADR, adrExists: true }).ok, true);
  assert.ok(Date.now() - t < 1000);
});
test("[VCK-004-AC2] malicious body is data, never executed", () => {
  const r = decide({ breaking: true, labels: [L], body: "$(rm -rf /) `id` ${{ secrets.X }} " + ADR, adrExists: true });
  assert.equal(r.ok, true);
});

// ---- CLI ----
const tmpDirs = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "vck-contracts-"));
  tmpDirs.push(d);
  return d;
};
test.after(() => tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const run = (env) => spawnSync(process.execPath, [cli], { cwd: repo, encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
const change = (level) => JSON.stringify([{ id: "request-property-became-required", text: "the request property `a` became required", level }]);
const fake = (script) => {
  const f = join(tmp(), "oasdiff");
  writeFileSync(f, `#!/bin/sh\n${script}\n`);
  chmodSync(f, 0o755);
  return f;
};
const spec = () => {
  const f = join(tmp(), "s.yaml");
  writeFileSync(f, "x");
  return f;
};
const viaFake = (script, extra = {}) => run({ BASE_SPEC: spec(), HEAD_SPEC: spec(), OASDIFF_BIN: fake(script), PR_LABELS: "[]", PR_BODY: "", ...extra });

test("[VCK-004-AC2] CLI: no changes => exit 0", () => {
  assert.equal(run({ BREAKING_JSON: "[]", PR_LABELS: "[]", PR_BODY: "" }).status, 0);
});
test("[VCK-004-AC2] CLI: warning-level only (2) is not breaking", () => {
  assert.equal(run({ BREAKING_JSON: change(2), PR_LABELS: "[]", PR_BODY: "" }).status, 0);
});
test("[VCK-004-AC2] CLI: ERR change without label => exit 1, lists the change", () => {
  const r = run({ BREAKING_JSON: change(3), PR_LABELS: "[]", PR_BODY: ADR });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /request-property-became-required/);
});
test("[VCK-004-AC2] CLI: label + ADR present in checkout => exit 0", () => {
  const r = run({ BREAKING_JSON: change(3), PR_LABELS: JSON.stringify([L]), PR_BODY: ADR });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test("[VCK-004-AC2] CLI: label + ADR template link => exit 1", () => {
  const r = run({ BREAKING_JSON: change(3), PR_LABELS: JSON.stringify([L]), PR_BODY: "docs/adr/ADR-000-template.md" });
  assert.equal(r.status, 1);
});
test("[VCK-004-AC2] CLI: label + made-up ADR number => exit 1", () => {
  const r = run({ BREAKING_JSON: change(3), PR_LABELS: JSON.stringify([L]), PR_BODY: "docs/adr/ADR-998-made-up.md" });
  assert.equal(r.status, 1);
});
test("[VCK-004-AC2] CLI fails closed on bad input (exit 2)", () => {
  const base = { PR_LABELS: "[]", PR_BODY: "" };
  for (const j of ["", "not json", "null", "{}", '[{"id":"x"}]', '[{"level":"x"}]']) assert.equal(run({ ...base, BREAKING_JSON: j }).status, 2, JSON.stringify(j));
  assert.equal(run({ ...base }).status, 2, "no input at all");
  assert.equal(run({ BREAKING_JSON: "[]", PR_LABELS: "nope", PR_BODY: "" }).status, 2, "labels not JSON");
  assert.equal(run({ BREAKING_JSON: "[]", PR_LABELS: '"contract-breaking"', PR_BODY: "" }).status, 2, "labels not an array");
});
test("[VCK-004-AC2] CLI via oasdiff: empty output, invalid JSON, spawn error, unexpected status => exit 2", () => {
  assert.equal(viaFake("exit 0").status, 2, "empty");
  assert.equal(viaFake("echo garbage").status, 2, "invalid");
  assert.equal(run({ BASE_SPEC: spec(), HEAD_SPEC: spec(), OASDIFF_BIN: join(tmp(), "missing"), PR_LABELS: "[]", PR_BODY: "" }).status, 2, "spawn");
  assert.equal(viaFake("echo '[]'; exit 102").status, 2, "status 102");
  assert.equal(viaFake("echo '[]'; exit 1").status, 2, "status 1");
});
test("[VCK-004-AC2] CLI via oasdiff: fake breaking output blocks, empty array passes", () => {
  assert.equal(viaFake(`echo '${change(3)}'`).status, 1);
  assert.equal(viaFake("echo '[]'").status, 0);
});

// ---- real oasdiff ----
const bin = [join(homedir(), "go/bin/oasdiff"), "/usr/local/bin/oasdiff"].find(existsSync);
const specV = (schema, desc) =>
  `openapi: 3.0.3\ninfo: {title: t, version: "1"}\npaths:\n  /x:\n    post:\n      operationId: op\n      description: ${desc}\n      requestBody:\n        content:\n          application/json:\n            schema: ${schema}\n      responses: {"200": {description: ok}}\n`;
const realRun = (a, b, extra = {}) => {
  const d = tmp();
  writeFileSync(join(d, "a.yaml"), a);
  writeFileSync(join(d, "b.yaml"), b);
  return run({ BASE_SPEC: join(d, "a.yaml"), HEAD_SPEC: join(d, "b.yaml"), OASDIFF_BIN: bin, PR_LABELS: "[]", PR_BODY: "", ...extra });
};
const open = "{type: object, properties: {a: {type: string}}}";
const req = "{type: object, required: [a], properties: {a: {type: string}}}";
test("[VCK-004-AC2] real oasdiff: required request field added is breaking", { skip: bin ? false : "oasdiff binary not installed (CI installs it)" }, () => {
  const r = realRun(specV(open, "one"), specV(req, "one"));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /request-property-became-required/);
  assert.equal(realRun(specV(open, "one"), specV(req, "one"), { PR_LABELS: JSON.stringify([L]), PR_BODY: ADR }).status, 0);
});
test("[VCK-004-AC2] real oasdiff: description-only change is not breaking", { skip: bin ? false : "oasdiff binary not installed (CI installs it)" }, () => {
  const r = realRun(specV(open, "one"), specV(open, "two"));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test("[VCK-004-AC2] real oasdiff: missing spec file => exit 2", { skip: bin ? false : "oasdiff binary not installed (CI installs it)" }, () => {
  assert.equal(run({ BASE_SPEC: join(tmp(), "no.yaml"), HEAD_SPEC: join(tmp(), "no.yaml"), OASDIFF_BIN: bin, PR_LABELS: "[]", PR_BODY: "" }).status, 2);
});
test("[VCK-004-AC2] ADR-014 exists in the checkout (fixture for the CLI tests)", () => {
  assert.ok(readFileSync(join(repo, "docs/adr/ADR-014-guest-order-access.md")).length > 0);
});
