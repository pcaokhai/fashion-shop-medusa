/* global URL, process */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../check-generated.mjs", import.meta.url));
const tmps = [];
after(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const GEN = "apps/storefront/src/generated/api.ts";
const GOLDEN = "contracts/vnpay/golden-vectors.json";
// temp git repo with committed generated files; never the real tree
const repo = () => {
  const d = mkdtempSync(join(tmpdir(), "vck-checkgen-"));
  tmps.push(d);
  for (const [f, c] of [[GEN, "a\n"], ["apps/backend/src/generated/api.zod.ts", "b\n"], [GOLDEN, "{}\n"], ["apps/storefront/src/other.ts", "c\n"]]) {
    mkdirSync(dirname(join(d, f)), { recursive: true });
    writeFileSync(join(d, f), c);
  }
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "x");
  return d;
};
const check = (d) => spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, VCK_ROOT: d, GIT_CEILING_DIRECTORIES: dirname(d) } });

test("[VCK-004-AC4] clean tree passes", () => {
  const r = check(repo());
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC4] a generated file edited by one byte fails and is named", () => {
  const d = repo();
  writeFileSync(join(d, GEN), "a\n ");
  const r = check(d);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /apps\/storefront\/src\/generated\/api\.ts/);
  assert.match(r.stdout + r.stderr, /make contracts/);
});

test("[VCK-004-AC4] a new untracked file under a generated dir fails", () => {
  const d = repo();
  writeFileSync(join(d, "apps/backend/src/generated/extra.ts"), "x\n");
  const r = check(d);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /extra\.ts/);
});

test("[VCK-004-AC4] edited golden vectors fail", () => {
  const d = repo();
  writeFileSync(join(d, GOLDEN), "{ }\n");
  assert.equal(check(d).status, 1);
});

test("[VCK-004-AC4] changes outside generated paths are ignored", () => {
  const d = repo();
  writeFileSync(join(d, "apps/storefront/src/other.ts"), "changed\n");
  assert.equal(check(d).status, 0);
});

test("[VCK-004-AC4] not a git repo fails closed with exit 2", () => {
  const d = mkdtempSync(join(tmpdir(), "vck-checkgen-"));
  tmps.push(d);
  assert.equal(check(d).status, 2);
});

test("[VCK-004-AC4] package scripts: contracts only regenerates, contracts-check adds the drift gate", async () => {
  const { readFileSync } = await import("node:fs");
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
  assert.ok(!pkg.scripts.contracts.includes("check-generated"));
  assert.match(pkg.scripts["contracts-check"], /\bcontracts\b.*check-generated/);
});

test("[VCK-004-AC4] Makefile: contracts and contracts-check targets, both in .PHONY", async () => {
  const { readFileSync } = await import("node:fs");
  const mk = readFileSync(fileURLToPath(new URL("../../../Makefile", import.meta.url)), "utf8");
  const phony = mk.match(/^\.PHONY:(.*)$/m)[1].split(/\s+/);
  assert.ok(phony.includes("contracts") && phony.includes("contracts-check"), phony.join(" "));
  assert.match(mk, /^contracts:\n\tpnpm --filter @vck\/contracts-tools run contracts$/m);
  assert.match(mk, /^contracts-check:\n\tpnpm --filter @vck\/contracts-tools run contracts-check$/m);
});
