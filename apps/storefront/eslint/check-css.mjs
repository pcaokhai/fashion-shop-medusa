// Scans src/**/*.css (not generated/) with findRawValues. Usage: node eslint/check-css.mjs [dir]. Fails closed.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findRawValues } from "./raw-values.mjs";

const defaultDir = fileURLToPath(new URL("../src", import.meta.url));

function blank(s) {
  return s.replace(/[^\n]/g, " ");
}

// Blank (keep newlines, so line numbers hold) comments and @media/@container/@supports preludes.
export function stripCss(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("/*", i);
    if (open === -1) break;
    const close = css.indexOf("*/", open + 2);
    const end = close === -1 ? css.length : close + 2;
    out += css.slice(i, open) + blank(css.slice(open, end));
    i = end;
  }
  out += css.slice(i);
  return out.replace(/@(?:media|container|supports)\b[^{;]*/gi, blank);
}

function listCss(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : listCss(p);
    return e.name.endsWith(".css") ? [p] : [];
  });
}

export function checkCss(dir) {
  const files = listCss(dir);
  const violations = [];
  for (const f of files) {
    const text = stripCss(readFileSync(f, "utf8"));
    let line = 1;
    let pos = 0;
    for (const h of findRawValues(text)) {
      for (; pos < h.index; pos++) if (text[pos] === "\n") line++;
      violations.push(`${relative(dir, f)}:${line}: raw ${h.kind} ${h.value}: use a design token`);
    }
  }
  return { files, violations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { files, violations } = checkCss(process.argv[2] ?? defaultDir);
    if (violations.length > 0) {
      console.error(violations.join("\n"));
      process.exit(1);
    }
    console.log(`check-css: OK (${files.length} css file(s))`);
  } catch (err) {
    console.error(`check-css: FAILED: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
