import { execFile } from "node:child_process";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const USES = /^\s*-?\s*uses:\s*(\S+?)(?:\s+#\s*(\S+))?\s*$/;
const PINNED = /^([\w.-]+\/[\w.-]+)(?:\/[\w./-]+)?@([0-9a-f]{40})$/;

export function parseUses(text) {
  const pins = [];
  const violations = [];
  text.split("\n").forEach((l, i) => {
    const m = USES.exec(l);
    if (!m || m[1].startsWith("./")) return; // local actions are in-repo
    const p = PINNED.exec(m[1]);
    if (!p || !/^v\d+\.\d+\.\d+$/.test(m[2] ?? "")) {
      violations.push(`line ${i + 1}: "${l.trim()}" must be owner/repo@<40-hex> # vX.Y.Z`);
      return;
    }
    pins.push({ ownerRepo: p[1], sha: p[2], tag: m[2], line: i + 1 });
  });
  return { pins, violations };
}

// Returns null when the pin's tag resolves to the pinned commit, else a message. Fails closed.
export async function verifyPin(pin, resolveTag) {
  const id = `${pin.ownerRepo}@${pin.tag}`;
  try {
    const got = await resolveTag(pin.ownerRepo, pin.tag);
    return got === pin.sha ? null : `${id}: pinned ${pin.sha} but tag resolves to ${got}`;
  } catch (e) {
    return `${id}: could not resolve tag (${e.message})`;
  }
}

const gh = async (path) => JSON.parse((await run("gh", ["api", path])).stdout);

export async function resolveTag(ownerRepo, tag) {
  let { type, sha } = (await gh(`repos/${ownerRepo}/git/ref/tags/${tag}`)).object;
  while (type === "tag") ({ type, sha } = (await gh(`repos/${ownerRepo}/git/tags/${sha}`)).object);
  if (type !== "commit") throw new Error(`tag points at a ${type}`);
  return sha;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = new URL("../.github/workflows/", import.meta.url);
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  const errors = [];
  let count = 0;
  for (const f of files) {
    const { pins, violations } = parseUses(readFileSync(new URL(f, dir), "utf8"));
    errors.push(...violations.map((v) => `${f} ${v}`));
    count += pins.length;
    const results = await Promise.all(pins.map((p) => verifyPin(p, resolveTag)));
    results.forEach((r, i) => r && errors.push(`${f} line ${pins[i].line}: ${r}`));
  }
  if (!files.length || errors.length) {
    console.error(errors.join("\n") || "no workflow files found");
    process.exit(1);
  }
  console.log(`action pins OK: ${count} pins in ${files.length} workflows verified against upstream tags`);
}
