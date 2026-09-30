// Backend Zod validators (params, query, headers, body, response for every operation) via orval's zod client.
import { generate } from "orval";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HEADER, specPath, run, isMain } from "./gen-util.mjs";

export const ZOD_PATH = "apps/backend/src/generated/api.zod.ts";

export async function buildZod() {
  const dir = mkdtempSync(join(tmpdir(), "vck-orval-"));
  try {
    await generate(
      {
        input: { target: specPath },
        output: { target: join(dir, "api.zod.ts"), client: "zod", mode: "single", clean: true, prettier: false },
      },
      dir,
    );
    const src = readFileSync(join(dir, "api.zod.ts"), "utf8");
    // drop orval's own banner (it embeds the spec description); ours replaces it
    return HEADER + src.slice(src.indexOf("import "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) await run(buildZod, ZOD_PATH);
