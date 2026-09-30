import { readFileSync } from "node:fs";
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
    return t !== undefined && t !== ")" && allow.includes(t);
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

export function checkLicences(pnpmJson, allowlist = ALLOWLIST, exceptions = []) {
  const offenders = [];
  const excepted = new Set();
  for (const e of exceptions) {
    if (!e.reason || !String(e.reason).trim()) offenders.push(`exception for ${e.package}: missing reason`);
    else excepted.add(e.package);
  }
  for (const [licence, pkgs] of Object.entries(pnpmJson ?? {})) {
    if (isAllowed(licence.trim(), allowlist)) continue;
    for (const p of pkgs) {
      if (!excepted.has(p.name)) offenders.push(`${p.name}@${(p.versions ?? []).join(",")}: ${licence || "(missing)"}`);
    }
  }
  return { ok: offenders.length === 0, offenders };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readFileSync(0, "utf8").trim();
  // pnpm prints plain text (not JSON) when there are no prod dependencies.
  const input = raw.startsWith("{") ? JSON.parse(raw) : {};
  const exceptions = JSON.parse(readFileSync(new URL("licence-exceptions.json", import.meta.url), "utf8"));
  const { ok, offenders } = checkLicences(input, ALLOWLIST, exceptions);
  if (!ok) {
    console.error(`Licence check failed:\n${offenders.map((o) => `  ${o}`).join("\n")}`);
    process.exit(1);
  }
  console.log("Licence check passed");
}
