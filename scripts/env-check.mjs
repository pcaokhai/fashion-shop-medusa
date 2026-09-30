// Helpers for the .env.example tests (kept out of *.test.mjs so the test glob does not run it).
const LITERALS = /^(|\d+|true|false|localhost|vck|vck-dev-only|vck-media|vck-local|dev-only-meili-key)$/;
const LOCAL_URL = /^(postgres|redis|http):\/\/(vck:(vck|vck-dev-only)@)?(localhost|127\.0\.0\.1|minio|postgres|redis)(:\d+)?(\/[\w-]*)?$/;

export const isPlaceholder = (value) =>
  (LITERALS.test(value) || LOCAL_URL.test(value)) && !/[A-Za-z0-9+/_]{20,}|sk_|AKIA|ghp_/.test(value);

// KEY=VALUE lines -> Map(name -> { value, commented }). A "# ----" section header is not a comment.
export const parseEnv = (text) => {
  const lines = text.split("\n");
  const out = new Map();
  lines.forEach((l, i) => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out.set(m[1], { value: m[2], commented: /^#(?! ?-{3,})/.test(lines[i - 1] ?? "") });
  });
  return out;
};
