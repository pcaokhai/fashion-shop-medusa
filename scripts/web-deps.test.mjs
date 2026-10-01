import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkLicences, ALLOWLIST } from "./check-licenses.mjs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const exceptions = JSON.parse(read("scripts/licence-exceptions.json"));
// Package names only; the lockfile is never printed.
const lockPkgs = new Set(read("pnpm-lock.yaml").match(/(?<=['"\s/])(?:@img\/sharp-libvips-[a-z0-9-]+|@img\/sharp-(?:wasm32|win32-[a-z0-9]+)|caniuse-lite)(?=@)/g));
const libvips = [...lockPkgs].filter((p) => p.startsWith("@img/sharp-libvips-"));
// Non-libvips sharp packages whose licence string is not allowlisted (npm view, sharp 0.35.5).
const sharpCompound = [...lockPkgs].filter((p) => /^@img\/sharp-(wasm32|win32-)/.test(p));
const compoundLicence = (n) => (n.endsWith("wasm32") ? "Apache-2.0 AND LGPL-3.0-or-later AND MIT" : "Apache-2.0 AND LGPL-3.0-or-later");
const LGPL = "LGPL-3.0-or-later";
const mapOf = (name, licence) => ({ [licence]: [{ name, versions: ["1.0.0"] }] });

test("every sharp-libvips platform package and caniuse-lite has an exact, reasoned exception [VCK-009-AC3]", () => {
  assert.ok(libvips.length > 0, "lockfile lists libvips packages");
  const need = [...libvips.map((n) => [n, LGPL]), ...sharpCompound.map((n) => [n, compoundLicence(n)]), ["caniuse-lite", "CC-BY-4.0"]];
  assert.equal(sharpCompound.length, 4);
  for (const [name, licence] of need) {
    const e = exceptions.filter((x) => x.package === name);
    assert.equal(e.length, 1, `one exception for ${name}`);
    assert.equal(e[0].licence, licence);
    assert.ok(e[0].reason.trim().length > 0, `reason for ${name}`);
    assert.equal(checkLicences(mapOf(name, licence), ALLOWLIST, exceptions).ok, true, name);
  }
});

test("only caniuse-lite and @img/sharp-* may be excepted [VCK-009-AC3]", () => {
  for (const e of exceptions) assert.ok(e.package === "caniuse-lite" || /^@img\/sharp-/.test(e.package), e.package);
});

test("no wildcard exceptions [VCK-009-AC3]", () => {
  for (const e of exceptions) assert.ok(!/[*?]/.test(e.package), e.package);
});

test("LGPL without the exception fails closed [VCK-009-AC3]", () => {
  assert.equal(checkLicences(mapOf(libvips[0], LGPL), ALLOWLIST, []).ok, false);
});

test("exception is licence-exact: GPL-3.0 for the same package still fails [VCK-009-AC3]", () => {
  assert.equal(checkLicences(mapOf(libvips[0], "GPL-3.0"), ALLOWLIST, exceptions).ok, false);
});

test("exception without a reason fails [VCK-009-AC3]", () => {
  const bad = [{ package: libvips[0], licence: LGPL, reason: " " }];
  assert.equal(checkLicences(mapOf(libvips[0], LGPL), ALLOWLIST, bad).ok, false);
});

test("no stale exception: every excepted package is in the lockfile [VCK-009-AC3]", () => {
  const all = read("pnpm-lock.yaml");
  for (const e of exceptions) assert.ok(all.includes(`${e.package}@`), `stale: ${e.package}`);
});

test("pnpm-workspace.yaml does not override sharp [VCK-009-AC3]", () => {
  assert.doesNotMatch(read("pnpm-workspace.yaml"), /overrides|sharp/);
});

test("docs record the LGPL notice and risk R-15 [VCK-009-AC3]", () => {
  assert.match(read("docs/12-documentation-lifecycle.md"), /LGPL/);
  assert.match(read("docs/09-risk-register.md"), /\| R-15 \|/);
});
