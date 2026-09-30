import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TITLE_RE = /^(feat|fix|refactor|docs|test|chore|perf|ci)(\([a-z0-9-]+\))?!?: .+ \(VCK-\d{3}\)$/;

export function checkPrTitle(title) {
  if (TITLE_RE.test(title ?? "")) return { ok: true, reason: "" };
  return {
    ok: false,
    reason: `PR title "${title}" must match type(scope)!: description (VCK-nnn); types: feat|fix|refactor|docs|test|chore|perf|ci`,
  };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ok, reason } = checkPrTitle(process.argv[2]);
  if (!ok) {
    console.error(reason);
    process.exit(1);
  }
}
