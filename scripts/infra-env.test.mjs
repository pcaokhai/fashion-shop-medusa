import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isPlaceholder, parseEnv } from "./env-check.mjs";

const root = new URL("../", import.meta.url);
const composeSrc = readFileSync(new URL("infra/docker-compose.yml", root), "utf8");
const example = parseEnv(readFileSync(new URL(".env.example", root), "utf8"));

// { VAR: default } for every ${VAR} / ${VAR:-default} in compose.
const composeVars = new Map();
for (const [, name, def] of composeSrc.matchAll(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g)) composeVars.set(name, def ?? "");

test("[VCK-002-AC4] every ${VAR} used in compose is listed in .env.example with a # comment above", () => {
  assert.ok(composeVars.size >= 11);
  for (const name of composeVars.keys()) {
    assert.ok(example.has(name), `${name} missing from .env.example`);
    assert.ok(example.get(name).commented, `${name} lacks a # comment on the line above`);
  }
});

test("[VCK-002-AC4] app-facing variables are documented with a comment", () => {
  for (const name of ["DATABASE_URL", "REDIS_URL", "MEILI_HOST", "MEILI_MASTER_KEY", "S3_ENDPOINT", "S3_BUCKET",
    "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_REGION", "S3_FORCE_PATH_STYLE", "SMTP_HOST", "SMTP_PORT"]) {
    assert.ok(example.get(name)?.commented, `${name} missing or uncommented`);
  }
});

test("[VCK-002-AC4] .env.example holds no real secrets", () => {
  for (const [k, { value }] of example) assert.ok(isPlaceholder(value), `${k} has a non-placeholder value`);
});

test("[VCK-002-AC4] placeholder checker rejects real-looking values", () => {
  for (const bad of [
    "postgres://admin:hunter2@prod.example.com/x",
    "postgres://vck:vck@prod.example.com:5432/vck",
    "http://localhost.evil.com:9002",
    "hunter2",
    "vck-prod",
    "sk_live_abcdef",
    "AKIAIOSFODNN7EXAMPLE",
    "ghp_abcdef",
    "dGhpcyBpcyBhIHJlYWxseSBsb25nIHNlY3JldA",
  ]) assert.equal(isPlaceholder(bad), false, bad);
  for (const good of ["", "5432", "vck", "vck-dev-only", "dev-only-meili-key", "postgres://vck:vck@localhost:5432/vck"])
    assert.equal(isPlaceholder(good), true, good);
});

test("[VCK-002-AC4] a section header above a var does not count as its comment", () => {
  const e = parseEnv("# ---- Redis ----\nA=1\n# real comment\nB=2\nC=3\n");
  assert.equal(e.get("A").commented, false);
  assert.equal(e.get("B").commented, true);
  assert.equal(e.get("C").commented, false);
});

test("[VCK-002-AC4] .env.example values equal the compose defaults (no drift)", () => {
  for (const [name, def] of composeVars) assert.equal(example.get(name)?.value, def, name);
});

test("[VCK-002-AC4] .env.example is tracked, .env is git-ignored", () => {
  const ci = (p) => spawnSync("git", ["check-ignore", p], { cwd: root, encoding: "utf8" });
  assert.equal(ci(".env.example").stdout, "");
  assert.match(ci(".env").stdout, /\.env/);
});
