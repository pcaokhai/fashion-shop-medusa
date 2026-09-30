import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const hasDocker = spawnSync("docker", ["compose", "version"]).status === 0;
const skip = hasDocker ? false : "docker compose not available; skipping compose checks";

// Scrubbed env + no .env file: results must not depend on the developer's shell.
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) => !/^(POSTGRES|REDIS|MEILI|MINIO|MAILPIT|VNPAY_SIM|GHN_SIM|COMPOSE)_/.test(k) && k !== "v",
  ),
);
const compose = () => {
  const r = spawnSync(
    "docker",
    ["compose", "--env-file", "/dev/null", "-f", "infra/docker-compose.yml", "config", "--format", "json"],
    { cwd: root, encoding: "utf8", env: cleanEnv },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

const SERVICES = ["postgres", "redis", "meilisearch", "minio", "mailpit", "vnpay-sim", "ghn-sim", "minio-init"];

test("[VCK-002-AC1] compose defines exactly the expected services", { skip }, () => {
  const c = compose();
  assert.equal(c.name, "vck");
  assert.deepEqual(Object.keys(c.services).sort(), [...SERVICES].sort());
});

test("[VCK-002-AC1] only postgres, meilisearch, minio have named volumes", { skip }, () => {
  const c = compose();
  assert.deepEqual(Object.keys(c.volumes).sort(), ["meili-data", "minio-data", "postgres-data"]);
});

test("[VCK-002-AC1] host ports match docs/02 §8 and R-002-1", { skip }, () => {
  const c = compose();
  const expected = {
    postgres: [5432],
    redis: [6379],
    meilisearch: [7700],
    minio: [9002, 9003],
    mailpit: [1025, 8025],
    "vnpay-sim": [9100],
    "ghn-sim": [9101],
  };
  for (const [svc, ports] of Object.entries(expected)) {
    const got = c.services[svc].ports.map((p) => {
      assert.equal(p.host_ip, "127.0.0.1", `${svc} must bind 127.0.0.1`);
      return Number(p.published);
    });
    assert.deepEqual(got.sort(), ports, svc);
  }
});

test("[VCK-002-AC1] documented ${VAR:-default} port defaults hold", { skip }, () => {
  const c = compose();
  const pub = (s) => c.services[s].ports.map((p) => `${p.published}:${p.target}`).sort();
  assert.deepEqual(pub("postgres"), ["5432:5432"]);
  assert.deepEqual(pub("minio"), ["9002:9000", "9003:9001"]);
  assert.deepEqual(pub("vnpay-sim"), ["9100:9100"]);
  assert.deepEqual(pub("ghn-sim"), ["9101:9101"]);
});

test("[VCK-002-AC4] credential vars default to the previous literals", { skip }, () => {
  const c = compose().services;
  assert.deepEqual(
    [c.postgres.environment.POSTGRES_USER, c.postgres.environment.POSTGRES_PASSWORD, c.postgres.environment.POSTGRES_DB],
    ["vck", "vck", "vck"],
  );
  assert.equal(c.postgres.healthcheck.test[1], "pg_isready -h 127.0.0.1 -U vck -d vck");
  assert.equal(c.meilisearch.environment.MEILI_MASTER_KEY, "dev-only-meili-key");
});

test("[VCK-002-AC2] minio-init is gated on minio health and does not restart", { skip }, () => {
  const c = compose().services["minio-init"];
  assert.equal(c.depends_on.minio.condition, "service_healthy");
  assert.equal(c.restart, "no");
});

test("[VCK-002-AC2] minio and minio-init share one pinned digest", { skip }, () => {
  const { minio, "minio-init": init } = compose().services;
  const digest = (i) => i.match(/@(sha256:[0-9a-f]{64})$/)?.[1];
  assert.ok(digest(minio.image));
  assert.equal(digest(init.image), digest(minio.image));
});

test("[VCK-002-AC2] minio-init forwards signals (init) and takes creds from minio's vars", { skip }, () => {
  const { minio, "minio-init": init } = compose().services;
  assert.equal(init.init, true);
  assert.equal(
    init.environment.MC_HOST_local,
    `http://${minio.environment.MINIO_ROOT_USER}:${minio.environment.MINIO_ROOT_PASSWORD}@minio:9000`,
  );
});

test("[VCK-002-AC2] sim healthchecks hit their own port", { skip }, () => {
  const c = compose().services;
  assert.match(c["vnpay-sim"].healthcheck.test.join(" "), /:9100\/health/);
  assert.match(c["ghn-sim"].healthcheck.test.join(" "), /:9101\/health/);
});

test("[VCK-002-AC2] every service has a healthcheck", { skip }, () => {
  const c = compose();
  for (const [name, svc] of Object.entries(c.services)) {
    assert.ok(svc.healthcheck?.test, `${name} lacks healthcheck`);
    assert.doesNotMatch(svc.image ?? "", /:latest$|^[^:]+$/, `${name} image must be pinned`);
    if (name === "postgres") assert.match(svc.image, /:\d+\.\d+-alpine\d+\.\d+$/, "postgres needs patch+alpine tag");
    if (name === "redis") assert.match(svc.image, /:\d+\.\d+\.\d+-alpine\d+\.\d+$/, "redis needs patch+alpine tag");
  }
});

// make -n from a temp dir holding a copy of the Makefile, with or without a root .env.
const dry = (target, { dotenv = false, v } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "vck-make-"));
  try {
    copyFileSync(new URL("Makefile", root), join(dir, "Makefile"));
    if (dotenv) writeFileSync(join(dir, ".env"), "POSTGRES_PORT=55432\n");
    const args = ["-n", target, ...(v === undefined ? [] : [`v=${v}`])];
    return spawnSync("make", args, { cwd: dir, encoding: "utf8", env: cleanEnv }).stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("[VCK-002-AC3] Makefile has up, down and v=1 handling", () => {
  const mk = readFileSync(new URL("Makefile", root), "utf8");
  assert.match(mk, /^\.PHONY:.*\bup\b.*\bdown\b/m);
  assert.match(mk, /^up:\n\t\$\(COMPOSE\) up -d --wait --wait-timeout 90$/m);
  assert.match(mk, /^down:\n\t\$\(COMPOSE\) down \$\(if \$\(filter 1,\$\(v\)\),-v\)$/m);
  assert.match(mk, /^COMPOSE := docker compose -f infra\/docker-compose\.yml \$\(if \$\(wildcard \.env\),--env-file \.env\)$/m);
  assert.match(dry("up"), /^docker compose -f infra\/docker-compose\.yml\s+up -d --wait --wait-timeout 90$/m);
  for (const dotenv of [false, true]) {
    assert.match(dry("down", { dotenv, v: 1 }), / -v$/m);
    for (const v of [0, "", undefined]) assert.doesNotMatch(dry("down", { dotenv, v }), / -v\b/, `v=${v} must keep volumes`);
  }
});

test("[VCK-002-AC4] make passes --env-file .env only when a root .env exists", () => {
  for (const target of ["up", "down"]) {
    assert.match(dry(target, { dotenv: true }), /docker-compose\.yml --env-file \.env /, `${target} with .env`);
    assert.doesNotMatch(dry(target), /--env-file/, `${target} without .env`);
  }
});
