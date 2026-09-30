import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ALLOWLIST = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "CC0-1.0", "BlueOak-1.0.0"];

// ponytail: SPDX parser handles parens, OR, AND only (no WITH / +); add when a dependency needs it.
function tokenize(expr) {
  return expr.match(/\(|\)|[^\s()]+/g) ?? [];
}

function isAllowed(expr, allow) {
  const toks = tokenize(expr);
  if (toks.length === 0) return false;
  let i = 0;
  const atom = () => {
    const t = toks[i++];
    if (t === "(") {
      const v = or();
      if (toks[i++] !== ")") throw new Error("unbalanced");
      return v;
    }
    if (t === undefined || t === ")" || t === "AND" || t === "OR") throw new Error("missing operand");
    return allow.includes(t);
  };
  const and = () => {
    let v = atom();
    while (toks[i] === "AND") { i++; v = atom() && v; }
    return v;
  };
  const or = () => {
    let v = and();
    while (toks[i] === "OR") { i++; v = and() || v; }
    return v;
  };
  try {
    const v = or();
    return i === toks.length && v;
  } catch {
    return false;
  }
}

const isStr = (v) => typeof v === "string" && v.trim() !== "";

export function checkLicences(pnpmJson, allowlist = ALLOWLIST, exceptions = []) {
  if (pnpmJson === null || typeof pnpmJson !== "object") throw new Error("licence input must be an object");
  const offenders = [];
  const excepted = new Set();
  for (const e of exceptions) {
    if (isStr(e?.package) && isStr(e.licence) && isStr(e.reason)) excepted.add(`${e.package}\0${e.licence}`);
    else offenders.push(`invalid exception ${JSON.stringify(e)}: needs package, licence and non-empty reason`);
  }
  for (const [licence, pkgs] of Object.entries(pnpmJson)) {
    if (isAllowed(licence.trim(), allowlist)) continue;
    for (const p of pkgs) {
      if (!excepted.has(`${p.name}\0${licence}`)) offenders.push(`${p.name}@${(p.versions ?? []).join(",")}: ${licence || "(missing)"}`);
    }
  }
  return { ok: offenders.length === 0, offenders };
}

const NO_DEPS = "No licenses in packages found";

// Fail closed: only the exact no-deps message or a well-formed licence map is accepted.
export function parsePnpmOutput(raw) {
  const text = raw.trim();
  if (text === NO_DEPS) return {};
  const j = JSON.parse(text);
  const valid = j !== null && typeof j === "object" && !Array.isArray(j) &&
    Object.values(j).every((v) => Array.isArray(v) && v.every((p) => p !== null && typeof p === "object" && typeof p.name === "string"));
  if (!valid) throw new Error("unexpected `pnpm licenses` output shape");
  return j;
}

function main() {
  const input = parsePnpmOutput(readFileSync(0, "utf8"));
  const exceptions = JSON.parse(readFileSync(new URL("licence-exceptions.json", import.meta.url), "utf8"));
  const { ok, offenders } = checkLicences(input, ALLOWLIST, exceptions);
  if (!ok) {
    console.error(`Licence check failed:\n${offenders.map((o) => `  ${o}`).join("\n")}`);
    process.exit(1);
  }
  console.log("Licence check passed");
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`Licence check failed: ${err.message}`);
    process.exit(1);
  }
}
