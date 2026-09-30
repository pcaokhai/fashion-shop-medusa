/* global process, console, URL */
// Usage: node compile-schemas.mjs [dir]  (default contracts/events)
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const dir = resolve(process.argv[2] ?? new URL("../../contracts/events", import.meta.url).pathname);
const files = readdirSync(dir).filter((f) => f.endsWith(".schema.json")).sort();
if (!files.length) {
  console.error(`no *.schema.json found in ${dir}`);
  process.exit(1);
}
let failed = 0;
for (const f of files) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  try {
    ajv.compile(JSON.parse(readFileSync(join(dir, f), "utf8")));
    console.log(`ok ${f}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${f}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
