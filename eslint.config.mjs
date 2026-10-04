import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.medusa/**", "apps/backend/*.{ts,js}", "apps/backend/integration-tests/**", "**/.turbo/**", "**/node_modules/**", "eslint.config.mjs", "scripts/**", "**/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  // JS config files (next.config.mjs etc.) are outside workspace tsconfig includes
  { files: ["**/*.{js,mjs,cjs}"], ...tseslint.configs.disableTypeChecked },
  { files: ["**/*.test.*"], rules: { "@typescript-eslint/no-non-null-assertion": "off" } },
  {
    // lane boundary: reusable code must not reach into apps/ (storefront may import ui-kit, not vice versa)
    files: ["packages/**", "tools/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["**/apps/**", "@vck/backend", "@vck/storefront"] }],
    },
  },
  {
    // "m only" (R-009-24): `motion.*` pulls the full feature bundle past LazyMotion strict. Repeats the lane patterns
    // for ui-kit because a later `no-restricted-imports` entry replaces the block above.
    files: ["packages/ui-kit/**", "apps/storefront/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["**/apps/**", "@vck/backend", "@vck/storefront"],
          paths: [{ name: "motion/react", importNames: ["motion"], message: "Use the `m` component with LazyMotion (R-009-24)." }],
        },
      ],
    },
  },
);
