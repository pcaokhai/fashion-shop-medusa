/* global process, console, URL */
// Regenerates contracts/vnpay/golden-vectors.json (the generator writes it in place) and fails if it differs from HEAD.
// Refuses to run when the golden file already has uncommitted (staged or unstaged) changes, so nothing is overwritten.
// VCK_ROOT overrides the repo root (tests use a temp git repo).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = process.env.VCK_ROOT ?? fileURLToPath(new URL("../../", import.meta.url));
const golden = "contracts/vnpay/golden-vectors.json";
const gen = "contracts/vnpay/generate_vectors.py";
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (spawnSync("python3", ["--version"]).error) fail("python3 is required to regenerate VNPay golden vectors (docs/03 §3); install Python 3 and retry");
if (!existsSync(`${root}/${golden}`) || !existsSync(`${root}/${gen}`)) fail(`missing ${golden} or ${gen} under ${root}`);
if (run("git", ["diff", "--quiet", "HEAD", "--", golden]).status !== 0) fail(`${golden} has uncommitted changes (or git failed); commit or restore it before running`);
if (run("python3", [gen]).status !== 0) fail("generate_vectors.py failed");
if (run("git", ["diff", "HEAD", "--exit-code", "--", golden]).status !== 0) fail("golden-vectors.json differs from the generator output");
