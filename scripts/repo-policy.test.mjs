import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const settings = JSON.parse(read(".claude/settings.json"));
const deny = settings.permissions.deny
  .map((r) => /^Read\((.*)\)$/.exec(r)?.[1])
  .filter(Boolean);

// Minimal glob -> regex: `**/` any dirs (incl. none), `**` anything, `*` within a segment.
const globRe = (g) =>
  new RegExp(
    "^" +
      g
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*\//g, "\u0000")
        .replace(/\*\*/g, "\u0001")
        .replace(/\*/g, "[^/]*")
        .replace(/\u0000/g, "(?:.*/)?")
        .replace(/\u0001/g, ".*") +
      "$",
  );
const denied = (p) => deny.some((g) => globRe(g).test(p));
const ignored = (p) =>
  spawnSync("git", ["check-ignore", "-q", "--no-index", p], { cwd: root }).status === 0;

// docs/11 §2 deny list, as concrete sample files.
const SAMPLES = [
  "node_modules/x/index.js",
  "apps/backend/.medusa/server/a.js",
  "apps/storefront/.next/cache/a",
  "apps/backend/dist/a.js",
  "packages/x/coverage/lcov.info",
  "playwright-report/index.html",
  "apps/backend/src/generated/types.ts",
  "pnpm-lock.yaml",
  "tools/seed/out/a.json",
  "backup.dump",
  "db.sql.gz",
  ".env",
  "apps/backend/.env",
  ".env.local",
  "apps/backend/.env.production",
  // enumerated: deny rules cannot negate `.env.example`, so each variant is listed
  ".env.staging",
  ".env.development",
  ".env.test",
  "apps/storefront/.env.production.local",
  "apps/storefront/.env.development.local",
  "apps/storefront/.env.test.local",
];

test("[VCK-001-AC4] every docs/11 §2 path is matched by a permissions.deny Read rule", () => {
  for (const p of SAMPLES) assert.ok(denied(`./${p}`), `${p} not denied`);
});

// docs/11 §2: `**/generated/**` is deny-only by design (must stay tracked); lockfile is committed, deny-only too.
const DENY_ONLY = ["pnpm-lock.yaml", "apps/backend/src/generated/types.ts"];
test("[VCK-001-AC4] ignorable docs/11 §2 paths are also gitignored", () => {
  for (const p of SAMPLES.filter((x) => !DENY_ONLY.includes(x)))
    assert.ok(ignored(p), `${p} not gitignored`);
});

test("[VCK-001-AC4] .env.example stays tracked and readable", () => {
  assert.ok(!ignored(".env.example"), ".env.example is gitignored");
  assert.ok(!denied("./.env.example") && !denied("./apps/backend/.env.example"), ".env.example is denied");
});

const owners = read(".github/CODEOWNERS")
  .split("\n")
  .filter((l) => l.trim() && !l.startsWith("#"))
  .map((l) => l.trim().split(/\s+/));
const hasOwner = (path) => owners.some(([p, ...o]) => p === path && o.length > 0);

test("[VCK-001-AC4] CODEOWNERS covers PLAT root files and ADM modules, * first", () => {
  assert.equal(owners[0][0], "*");
  for (const p of [
    "/Makefile", "/turbo.json", "/pnpm-workspace.yaml", "/package.json",
    "/tsconfig.base.json", "/eslint.config.mjs", "/scripts/",
    "/apps/backend/src/modules/audit_log/",
    "/apps/backend/src/modules/import_job/",
    "/apps/backend/src/modules/reporting/",
  ]) assert.ok(hasOwner(p), `${p} lacks owner`);
});

test("[VCK-001-AC4] .claude/settings.json is valid JSON with deny rules", () => {
  assert.ok(Array.isArray(settings.permissions.deny) && deny.length > 0);
});
