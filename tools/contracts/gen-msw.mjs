// MSW handlers: one per fixture-mapped operation, fixture JSON inlined (self-contained, no fs/contract imports).
// Matching is path-only with a `*` origin wildcard, so it works for any API base URL (spec server is localhost:9000).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { HEADER, repoRoot, specPath, run, isMain } from "./gen-util.mjs";

export const MSW_PATH = "apps/storefront/src/generated/msw-handlers.ts";
export const FIXTURE_MAP = join(repoRoot, "tools/contracts/fixture-map.json");
const METHODS = ["get", "put", "post", "delete", "options", "head", "patch"];

const ENTRY_KEYS = ["fixture", "key", "status"];

/** Throws on typos / missing fields so a bad map never silently drops a handler. */
export function validateMap(raw) {
  const { unmapped_fixtures: unmapped = [], ...ops } = raw;
  const errs = [];
  for (const [id, e] of Object.entries(ops)) {
    if (typeof e !== "object" || e === null || Array.isArray(e)) errs.push(`${id}: entry must be an object`);
    else {
      for (const k of Object.keys(e)) if (!ENTRY_KEYS.includes(k)) errs.push(`${id}: unknown property "${k}"`);
      if (typeof e.fixture !== "string") errs.push(`${id}: "fixture" must be a string`);
      if (!Number.isInteger(e.status)) errs.push(`${id}: "status" must be an integer`);
      if (e.key !== undefined && typeof e.key !== "string") errs.push(`${id}: "key" must be a string`);
    }
  }
  if (!Array.isArray(unmapped) || unmapped.some((u) => typeof u?.file !== "string" || typeof u?.reason !== "string"))
    errs.push("unmapped_fixtures: must be an array of { file, reason } strings");
  if (errs.length) throw new Error(`invalid fixture-map: ${errs.join("; ")}`);
  return { ops, unmapped };
}

export const readMap = (file = FIXTURE_MAP) => validateMap(JSON.parse(readFileSync(file, "utf8")));

export function specOperations(file = specPath) {
  const spec = parse(readFileSync(file, "utf8"));
  const out = [];
  for (const [path, item] of Object.entries(spec.paths))
    for (const m of METHODS) if (item[m]) out.push({ id: item[m].operationId, method: m, path, responses: Object.keys(item[m].responses) });
  return out;
}

export const FIXTURES_DIR = join(repoRoot, "contracts/fixtures");

export function fixtureBody({ fixture, key }, dir = FIXTURES_DIR) {
  const json = JSON.parse(readFileSync(join(dir, fixture), "utf8"));
  return key === undefined ? json : json[key];
}

export const toMswPath = (specPath) => "*" + specPath.replace(/\{([^}]+)\}/g, ":$1");

// msw matches in order: literal segments must precede a parameterised sibling (/x/search before /x/:id).
const isParam = (seg) => seg.startsWith("{");
function byRoute(a, b) {
  const [sa, sb] = [a.path.split("/"), b.path.split("/")];
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const [x, y] = [sa[i], sb[i]];
    if (x === y) continue;
    if (isParam(x) !== isParam(y)) return isParam(x) ? 1 : -1;
    return x < y ? -1 : 1;
  }
  return sa.length - sb.length || (a.method < b.method ? -1 : a.method > b.method ? 1 : 0);
}

export async function buildMsw({ specFile = specPath, map = readMap().ops, fixturesDir = FIXTURES_DIR } = {}) {
  const ops = map;
  const all = specOperations(specFile).sort(byRoute);
  const mapped = all.filter((o) => ops[o.id]);
  const unmapped = all.filter((o) => !ops[o.id]).map((o) => o.id).sort();
  const handlers = mapped.map((o) => {
    const e = ops[o.id];
    const path = toMswPath(o.path);
    const body = JSON.stringify(fixtureBody(e, fixturesDir), null, 2).replace(/\n/g, "\n  ");
    return `  // ${o.id} <- ${e.fixture}${e.key ? `#${e.key}` : ""}\n  http.${o.method}(${JSON.stringify(path)}, () =>\n    HttpResponse.json(${body}, { status: ${e.status} }),\n  ),`;
  });
  return [
    HEADER.trimEnd(),
    "//",
    "// Operations without a fixture (no handler generated):",
    ...unmapped.map((id) => `//   ${id}`),
    "",
    'import { http, HttpResponse } from "msw";',
    "",
    "export const handlers = [",
    ...handlers,
    "];",
  ].join("\n");
}

if (isMain(import.meta.url)) await run(buildMsw, MSW_PATH);
