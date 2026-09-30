import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const hasDocker = spawnSync("docker", ["compose", "version"]).status === 0;
const skip = hasDocker ? false : "docker compose not available; skipping compose checks";

const compose = () => {
  const r = spawnSync(
    "docker",
    ["compose", "-f", "infra/docker-compose.yml", "config", "--format", "json"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

// Task 1 subset; Task 2 adds vnpay-sim, ghn-sim (and minio-init).
const DATA_SERVICES = ["postgres", "redis", "meilisearch", "minio", "mailpit"];

test("[VCK-002-AC1] compose defines postgres, redis, meilisearch, minio, mailpit", { skip }, () => {
  const c = compose();
  assert.equal(c.name, "vck");
  for (const s of DATA_SERVICES) assert.ok(c.services[s], `missing service ${s}`);
});

test("[VCK-002-AC1] host ports match docs/02 §8 and R-002-1", { skip }, () => {
  const c = compose();
  const expected = {
    postgres: [5432],
    redis: [6379],
    meilisearch: [7700],
    minio: [9002, 9003],
    mailpit: [1025, 8025],
  };
  for (const [svc, ports] of Object.entries(expected)) {
    const got = c.services[svc].ports.map((p) => {
      assert.equal(p.host_ip, "127.0.0.1", `${svc} must bind 127.0.0.1`);
      return Number(p.published);
    });
    assert.deepEqual(got.sort(), ports, svc);
  }
});

test("[VCK-002-AC2] every service has a healthcheck", { skip }, () => {
  const c = compose();
  for (const [name, svc] of Object.entries(c.services)) {
    assert.ok(svc.healthcheck?.test, `${name} lacks healthcheck`);
    assert.doesNotMatch(svc.image ?? "", /:latest$|^[^:]+$/, `${name} image must be pinned`);
  }
});

test("[VCK-002-AC3] Makefile has up, down and v=1 handling", () => {
  const mk = readFileSync(new URL("Makefile", root), "utf8");
  assert.match(mk, /^\.PHONY:.*\bup\b.*\bdown\b/m);
  assert.match(mk, /^up:\n\tdocker compose -f infra\/docker-compose\.yml up -d --wait --wait-timeout 90$/m);
  assert.match(mk, /^down:\n\tdocker compose -f infra\/docker-compose\.yml down \$\(if \$\(v\),-v\)$/m);
});
