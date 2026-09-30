// MSW handlers: one per fixture-mapped operation, fixture JSON inlined (self-contained, no fs/contract imports).
// Matching is path-only with a `*` origin wildcard, so it works for any API base URL (spec server is localhost:9000).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { HEADER, repoRoot, specPath, run, isMain } from "./gen-util.mjs";

export const MSW_PATH = "apps/storefront/src/generated/msw-handlers.ts";
export const FIXTURE_MAP = join(repoRoot, "tools/contracts/fixture-map.json");
const METHODS = ["get", "put", "post", "delete", "options", "head", "patch"];

export function readMap() {
  const { unmapped_fixtures: unmapped = [], ...ops } = JSON.parse(readFileSync(FIXTURE_MAP, "utf8"));
  return { ops, unmapped };
}

export function specOperations() {
  const spec = parse(readFileSync(specPath, "utf8"));
  const out = [];
  for (const [path, item] of Object.entries(spec.paths))
    for (const m of METHODS) if (item[m]) out.push({ id: item[m].operationId, method: m, path, responses: Object.keys(item[m].responses) });
  return out;
}

export function fixtureBody({ fixture, key }) {
  const json = JSON.parse(readFileSync(join(repoRoot, "contracts/fixtures", fixture), "utf8"));
  return key === undefined ? json : json[key];
}

export async function buildMsw() {
  const { ops } = readMap();
  const all = specOperations().sort((a, b) => (a.id < b.id ? -1 : 1));
  const mapped = all.filter((o) => ops[o.id]);
  const unmapped = all.filter((o) => !ops[o.id]).map((o) => o.id);
  const handlers = mapped.map((o) => {
    const e = ops[o.id];
    const path = "*" + o.path.replace(/\{([^}]+)\}/g, ":$1");
    const body = JSON.stringify(fixtureBody(e), null, 2).replace(/\n/g, "\n  ");
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
