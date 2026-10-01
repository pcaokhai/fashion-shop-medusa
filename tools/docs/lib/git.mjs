/* global TextDecoder, process */
import { realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ReleaseError } from "./errors.mjs";

const MAX_BUFFER = 64 * 1024 * 1024;
export const TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const decoder = new TextDecoder("utf-8"); // invalid bytes become U+FFFD, never an exception

/** Deterministic child env: C locale, no system config, no inherited repo redirection. */
function childEnv() {
  const env = { ...process.env, LC_ALL: "C", GIT_CONFIG_NOSYSTEM: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" };
  for (const k of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_NAMESPACE"]) delete env[k];
  return env;
}

/** Runs git; returns { status, out, err }. Throws ReleaseError only when git cannot be spawned. */
export function gitRun(root, args) {
  const r = spawnSync("git", ["-C", root, ...args], { env: childEnv(), maxBuffer: MAX_BUFFER });
  if (r.error) throw new ReleaseError(`cannot run git (${r.error.code ?? r.error.message})`);
  return { status: r.status, out: decoder.decode(r.stdout), err: decoder.decode(r.stderr).trim() };
}

/** stdout of `git <args>`; any non-zero exit throws. */
export function git(root, args) {
  const r = gitRun(root, args);
  if (r.status !== 0) throw new ReleaseError(`git ${args[0]} failed (exit ${r.status}): ${r.err.split("\n")[0]}`);
  return r.out;
}

/** Newest v* tag reachable from HEAD, null when there is none; a tag that is not vMAJOR.MINOR.PATCH is refused by name. */
export function lastTag(root) {
  const r = gitRun(root, ["describe", "--tags", "--abbrev=0", "--match", "v*"]);
  if (r.status !== 0) {
    if (/No names found|No tags can describe/.test(r.err)) return null;
    throw new ReleaseError(`git describe failed (exit ${r.status}): ${r.err.split("\n")[0]}`);
  }
  const tag = r.out.trim();
  if (!TAG.test(tag)) throw new ReleaseError(`last tag '${tag}' is not vMAJOR.MINOR.PATCH; fix or delete it first`);
  return tag;
}

/** R-008-16: refuses anything but a clean, attached, full clone at the repository root with no v<version> tag. */
export function assertReleasable(root, version) {
  const top = gitRun(root, ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) throw new ReleaseError(`${root} is not a git repository`);
  if (realpathSync(top.out.trim()) !== realpathSync(root)) throw new ReleaseError(`${root} is not the repository root (${top.out.trim()})`);
  if (gitRun(root, ["symbolic-ref", "-q", "HEAD"]).status !== 0) throw new ReleaseError("detached HEAD: check out a branch first");
  if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() !== "false") throw new ReleaseError("shallow clone: fetch the full history first");
  if (git(root, ["status", "--porcelain", "--untracked-files=all"]).trim() !== "") throw new ReleaseError("working tree is not clean (commit, stash or remove changes, including untracked files)");
  if (gitRun(root, ["rev-parse", "-q", "--verify", `refs/tags/v${version}`]).status === 0) throw new ReleaseError(`tag v${version} already exists`);
}

/** Commits in (sinceTag, HEAD], oldest first, merges excluded: { commits: [{ subject, body }], merges }. */
export function readCommits(root, sinceTag) {
  const range = sinceTag ? [`${sinceTag}..HEAD`] : ["HEAD"];
  const log = git(root, ["log", "--no-merges", "--reverse", "--format=%s%x1f%b%x1e", ...range, "--"]);
  const commits = log.split("\x1e").map((r) => r.replace(/^\n/, "")).filter((r) => r !== "").map((r) => {
    const [subject, ...body] = r.split("\x1f");
    return { subject, body: body.join("\x1f") };
  });
  const merges = Number(git(root, ["rev-list", "--merges", "--count", ...range, "--"]).trim());
  if (!Number.isInteger(merges)) throw new ReleaseError("git rev-list returned a non-numeric count");
  return { commits, merges };
}
