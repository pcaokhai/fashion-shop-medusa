/* global process, URL */
// Fixture git repos for release tests: real template/README, minimal CHANGELOG, deterministic commits.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, lstatSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseFiles } from "./fixture.mjs";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const RELEASE_CLI = fileURLToPath(new URL("../release-cli.mjs", import.meta.url));
export const CHECK_CLI = fileURLToPath(new URL("../check-cli.mjs", import.meta.url));
export const FIXED_DATE = "2026-10-02";
export const TMP_PREFIX = "docs-release-";

const COMMIT_DATE = "2026-09-01T12:00:00Z";
export const gitEnv = () => ({
  ...process.env,
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_DATE: COMMIT_DATE,
  GIT_COMMITTER_DATE: COMMIT_DATE,
});

/** Runs git in `cwd`; throws on non-zero, returns stdout. */
export function g(cwd, ...args) {
  const r = spawnSync("git", ["-C", cwd, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { env: gitEnv(), encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
}

const real = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
export const TEMPLATE = real("docs/releases/RELEASE-template.md");

/** All files a release run (and docs-check) needs. */
export const docsFiles = () => ({
  ...baseFiles(),
  "docs/releases/RELEASE-template.md": TEMPLATE,
  "docs/releases/README.md": real("docs/releases/README.md"),
  "CHANGELOG.md": "# Changelog\n\n## [Unreleased]\n### Added\n- Keep me.\n\n## [0.0.1] - 2026-01-01\n- old\n",
});

export function writeFiles(root, files) {
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
}

export const tmp = () => mkdtempSync(join(tmpdir(), TMP_PREFIX));

/** Number of leftover fixture directories in os.tmpdir(). */
export const tmpCount = () => readdirSync(tmpdir()).filter((n) => n.startsWith(TMP_PREFIX)).length;

/**
 * Repo on branch main: commit "chore: init" holds the files, then one empty commit per subject (string or [subject, body]).
 * tags: { "v0.1.0": n } tags the repo after n subjects (0 = init commit). files overrides docsFiles(); null removes one.
 */
export function repoWith(subjects = [], { tags = {}, files = {} } = {}) {
  const root = tmp();
  g(root, "init", "-q", "-b", "main");
  const all = { ...docsFiles(), ...files };
  writeFiles(root, Object.fromEntries(Object.entries(all).filter(([, v]) => v !== null)));
  g(root, "add", "-A");
  g(root, "commit", "-q", "-m", "chore: init");
  const tagAt = (n) => Object.entries(tags).filter(([, at]) => at === n).forEach(([name]) => g(root, "tag", name));
  tagAt(0);
  subjects.forEach((s, i) => {
    const [subject, body] = Array.isArray(s) ? s : [s];
    g(root, "commit", "-q", "--allow-empty", "-m", subject, ...(body ? ["-m", body] : []));
    tagAt(i + 1);
  });
  return root;
}

/** A real merge commit (no-ff) on main. */
export function addMerge(root) {
  g(root, "checkout", "-q", "-b", "side");
  g(root, "commit", "-q", "--allow-empty", "-m", "feat: on side");
  g(root, "checkout", "-q", "main");
  g(root, "merge", "-q", "--no-ff", "-m", "Merge branch 'side'", "side");
}

/** sha256 over every file under root (relative path + type + content), `.git` excluded. */
export function snapshot(root) {
  const h = createHash("sha256");
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (dir === root && name === ".git") continue;
      const p = join(dir, name);
      const rel = p.slice(root.length);
      if (lstatSync(p).isDirectory()) {
        h.update(`D ${rel}\n`);
        walk(p);
      } else h.update(`F ${rel}\n${readFileSync(p).toString("base64")}\n`);
    }
  };
  walk(root);
  return h.digest("hex");
}

/** Runs release-cli.mjs; env overrides replace the defaults (undefined removes a key). */
export function runRelease(root, args, env = {}) {
  const r = spawnSync(process.execPath, [RELEASE_CLI, ...args], {
    cwd: tmpdir(),
    encoding: "utf8",
    env: { ...process.env, VCK_ROOT: root, VCK_DATE: FIXED_DATE, ...env },
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
