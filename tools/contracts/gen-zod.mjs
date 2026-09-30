/* global process, URL */
// Backend Zod validators (params, query, headers, body, response for every operation) via orval's zod client.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HEADER, specPath, run, isMain } from "./gen-util.mjs";

export const ZOD_PATH = "apps/backend/src/generated/api.zod.ts";

export async function buildZod() {
  const dir = mkdtempSync(join(tmpdir(), "vck-orval-"));
  try {
    // Fresh process per run: orval 7 keeps module-level state and suffixes repeated names ("...One") on a 2nd in-process run.
    const cfg = { input: { target: specPath }, output: { target: join(dir, "api.zod.ts"), client: "zod", mode: "single", clean: true, prettier: false, override: { zod: { dateTimeOptions: { offset: true } } } } };
    const code = `import { generate } from "orval"; await generate(${JSON.stringify(cfg)}, ${JSON.stringify(dir)});`;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" });
    if (r.status !== 0) throw new Error(`orval failed:\n${r.stdout}${r.stderr}`);
    const src = readFileSync(join(dir, "api.zod.ts"), "utf8");
    // drop orval's own banner (it embeds the spec description); ours replaces it
    return HEADER + src.slice(src.indexOf("import "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) await run(buildZod, ZOD_PATH);
