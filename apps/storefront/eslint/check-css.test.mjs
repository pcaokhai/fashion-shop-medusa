// [VCK-009-AC2] check-css.mjs over temp dirs only; fails closed.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-css.mjs", import.meta.url));
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
const withDir = (t, files) => {
  const dir = mkdtempSync(join(tmpdir(), "vck-css-"));
  t.onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  return dir;
};

const CASES = [
  ["raw hex", "a{color:#fff}", 1],
  ["token", "a{color:var(--color-primary)}", 0],
  ["media prelude", "@media (min-width: 768px){a{color:var(--c)}}", 0],
  ["container prelude", "@container (min-width: 40px){a{margin:0}}", 0],
  ["supports prelude", "@supports (width: 13px){a{margin:0}}", 0],
  ["raw px", "a{padding:13px}", 1],
  ["px inside media body", "@media (min-width: 768px){a{padding:13px}}", 1],
  ["comment only", "/* #fff 13px rgb(1,2,3) */ a{margin:0}", 0],
  ["unclosed comment", "a{margin:0} /* #fff", 0],
  ["colour fn", "a{color:oklch(68% .2 250)}", 1],
  ["allowed 1px", "a{border:1px solid var(--color-border)}", 0],
];

describe("check-css [VCK-009-AC2]", () => {
  for (const [name, css, code] of CASES) {
    it(name, (t) => {
      const r = run(withDir(t, { "a.css": css }));
      expect(r.status, r.stdout + r.stderr).toBe(code);
    });
  }
  it("reports path:line: message", (t) => {
    const r = run(withDir(t, { "deep/a.css": "a{}\n/* c */\nb{color:#fff}" }));
    expect(r.stderr).toMatch(/deep[\\/]a\.css:3: .*#fff/);
  });
  it("ignores generated/ and non-css files", (t) => {
    const r = run(withDir(t, { "generated/g.css": "a{color:#fff}", "x.txt": "#fff", "ok.css": "a{margin:0}" }));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("check-css: OK (1 css file(s))");
  });
  it("zero css files passes and prints 0", (t) => {
    const r = run(withDir(t, {}));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("check-css: OK (0 css file(s))");
  });
  it("missing dir fails closed", () => {
    expect(run(join(tmpdir(), "vck-css-does-not-exist")).status).not.toBe(0);
  });
  it.skipIf(process.getuid?.() === 0)("unreadable file fails closed", (t) => {
    const dir = withDir(t, { "a.css": "a{}" });
    chmodSync(join(dir, "a.css"), 0o000);
    expect(run(dir).status).not.toBe(0);
  });
  it("handles a 1 MB line quickly", (t) => {
    const dir = withDir(t, { "big.css": "a{margin:0}" + " ".repeat(1e6) + "/*".repeat(1e5) });
    const t0 = Date.now();
    expect(run(dir).status).toBe(0);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});
