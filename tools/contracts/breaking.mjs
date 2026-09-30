/* global process, console, URL */
// Breaking-change gate. Env: PR_LABELS (JSON array), PR_BODY, and either BREAKING_JSON (oasdiff `breaking --format json` output)
// or BASE_SPEC + HEAD_SPEC (runs $OASDIFF_BIN, default `oasdiff`). Exit 0 ok, 1 blocked, 2 tool/input error (fails closed).
// oasdiff levels (observed v1.32.1): 1 info, 2 warn, 3 err. Only 3 is "breaking". `breaking` exits 0 even with changes; any other status is an error.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const BREAKING_LABEL = "contract-breaking";
// ADR-000 is the template, never a decision. Prefix form is not enough: the full file name is required so existence can be checked. No `/` allowed after ADR-nnn => no traversal.
const ADR_LINK = /docs\/adr\/ADR-(?!000)\d{3}[A-Za-z0-9._-]*\.md/g;
const MAX_LINKS = 20;
const MAX_LISTED = 25;

export const adrLinks = (body) => [...String(body ?? "").matchAll(ADR_LINK)].slice(0, MAX_LINKS).map((m) => m[0]);

export function decide({ breaking, labels, body, adrExists }) {
  if (!breaking) return { ok: true, reason: "no breaking changes" };
  if (!Array.isArray(labels) || !labels.includes(BREAKING_LABEL)) return { ok: false, reason: `breaking change requires the label '${BREAKING_LABEL}'` };
  if (!adrLinks(body).length) return { ok: false, reason: "PR body must link an ADR file (docs/adr/ADR-<nnn>-<slug>.md)" };
  if (adrExists !== true) return { ok: false, reason: "linked ADR file does not exist in this checkout" };
  return { ok: true, reason: "breaking change acknowledged: label and existing ADR present" };
}

const die = (msg) => {
  console.error(`breaking: ${msg}`);
  process.exit(2);
};

function readChanges(env) {
  let raw = env.BREAKING_JSON;
  if (raw === undefined) {
    if (!env.BASE_SPEC || !env.HEAD_SPEC) die("set BREAKING_JSON or BASE_SPEC and HEAD_SPEC");
    const r = spawnSync(env.OASDIFF_BIN || "oasdiff", ["breaking", env.BASE_SPEC, env.HEAD_SPEC, "--format", "json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error) die(`oasdiff spawn failed: ${r.error.message}`);
    if (r.status !== 0) die(`oasdiff exit status ${r.status}\n${r.stdout}${r.stderr}`);
    raw = r.stdout;
  }
  let changes;
  try {
    changes = JSON.parse(raw);
  } catch {
    die("oasdiff output is not JSON");
  }
  if (!Array.isArray(changes)) die("oasdiff output is not an array");
  for (const c of changes) if (!c || typeof c !== "object" || ![1, 2, 3].includes(c.level)) die("oasdiff change without a valid level (1-3)");
  return changes;
}

function main(env) {
  const changes = readChanges(env);
  let labels;
  try {
    labels = JSON.parse(env.PR_LABELS ?? "");
  } catch {
    die("PR_LABELS is not JSON");
  }
  if (!Array.isArray(labels)) die("PR_LABELS is not an array");
  const body = env.PR_BODY ?? "";
  const errs = changes.filter((c) => c.level === 3);
  const adrExists = adrLinks(body).some((l) => existsSync(resolve(fileURLToPath(new URL("../../", import.meta.url)), l)));
  const d = decide({ breaking: errs.length > 0, labels, body, adrExists });
  for (const c of errs.slice(0, MAX_LISTED)) console.log(`breaking: ${c.id ?? "?"}: ${c.text ?? ""}`);
  if (errs.length > MAX_LISTED) console.log(`breaking: ... and ${errs.length - MAX_LISTED} more`);
  console.log(`breaking: ${errs.length} breaking change(s); ${d.ok ? "OK" : "BLOCKED"}: ${d.reason}`);
  process.exit(d.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.env);
