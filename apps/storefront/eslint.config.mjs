import root from "../../eslint.config.mjs";
import vck from "./eslint/raw-values.mjs";

export default [
  ...root,
  { ignores: [".next/**", "next-env.d.ts"] },
  // node scripts under eslint/ (no @types/node / globals dependency needed for three globals)
  { files: ["eslint/**/*.mjs", "*.mjs"], languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } } },
  {
    files: ["src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
    ignores: ["src/generated/**"],
    plugins: { vck },
    rules: { "vck/no-raw-values": "error" },
  },
];
