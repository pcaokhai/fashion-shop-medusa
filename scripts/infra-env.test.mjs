import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const composeSrc = readFileSync(new URL("infra/docker-compose.yml", root), "utf8");
const exampleLines = readFileSync(new URL(".env.example", root), "utf8").split("\n");

// { VAR: default } for every ${VAR} / ${VAR:-default} in compose.
const composeVars = new Map();
for (const [, name, def] of composeSrc.matchAll(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g)) composeVars.set(name, def ?? "");

// { VAR: { value, commented } } for KEY=VALUE lines; commented = line directly above starts with "#".
const example = new Map();
exampleLines.forEach((l, i) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) example.set(m[1], { value: m[2], commented: /^#/.test(exampleLines[i - 1] ?? "") });
});

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
  const ok = /^(|\d+|true|false|localhost|vck(-[a-z0-9-]+)?|dev-only-[a-z0-9-]+|[a-z]+:\/\/[^\s]*)$/;
  for (const [k, { value }] of example) {
    assert.match(value, ok, `${k} has a non-placeholder value`);
    assert.doesNotMatch(value, /[A-Za-z0-9+/_]{20,}|sk_|AKIA|ghp_/, `${k} looks like a real secret`);
  }
});

test("[VCK-002-AC4] .env.example values equal the compose defaults (no drift)", () => {
  for (const [name, def] of composeVars) assert.equal(example.get(name)?.value, def, name);
});

test("[VCK-002-AC4] .env.example is tracked, .env is git-ignored", () => {
  const ci = (p) => spawnSync("git", ["check-ignore", p], { cwd: root, encoding: "utf8" });
  assert.equal(ci(".env.example").stdout, "");
  assert.match(ci(".env").stdout, /\.env/);
});
