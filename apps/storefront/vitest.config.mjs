import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig has jsx: preserve (Next compiles JSX); tests need a real transform
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["eslint/**/*.test.mjs", "src/**/*.test.{ts,tsx}"],
    passWithNoTests: false,
    // First typed-lint run is a cold TypeScript project load (~6s on CI runners).
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
