import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "eslint.config.mjs", "scripts/**", "**/generated/**"] },
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
);
