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
// "/*" inside strings and url(...) is not a comment. Returns { text, unclosed: index of an unclosed comment | -1 }.
export function stripCss(css) {
  let out = "";
  let i = 0;
  let unclosed = -1;
  while (i < css.length) {
    const rest = css.slice(i, i + 4).toLowerCase();
    let end; // end of a span to copy verbatim
    if (css.startsWith("/*", i)) {
      const close = css.indexOf("*/", i + 2);
      end = close === -1 ? css.length : close + 2;
      if (close === -1) unclosed = i;
      out += blank(css.slice(i, end));
      i = end;
      continue;
    }
    if (css[i] === '"' || css[i] === "'") {
      end = i + 1;
      while (end < css.length && css[end] !== css[i] && css[end] !== "\n") end += css[end] === "\\" ? 2 : 1;
      end = Math.min(end + 1, css.length);
    } else if (rest === "url(" && !/^\s*["']/.test(css.slice(i + 4, i + 24))) {
      const close = css.indexOf(")", i + 4);
      end = close === -1 ? css.length : close + 1;
    } else {
      out += css[i++];
      continue;
    }
    out += css.slice(i, end);
    i = end;
  }
  return { text: out.replace(/@(?:media|container|supports)\b[^{;]*/gi, blank), unclosed };
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
    const raw = readFileSync(f, "utf8");
    const { text, unclosed } = stripCss(raw);
    if (unclosed !== -1) {
      const line = raw.slice(0, unclosed).split("\n").length;
      violations.push(`${relative(dir, f)}:${line}: unclosed comment`);
    }
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
