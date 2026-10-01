import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import("next").NextConfig} */
const nextConfig = {
  // e2e builds the production bundle into its own dir so it never clobbers the dev server's .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  transpilePackages: ["@vck/ui-kit"],
  // webpack keeps the barrel's "use client" Reveal/Stagger in the layout chunk without this (+39 KB gz); Turbopack uses sideEffects
  experimental: { optimizePackageImports: ["@vck/ui-kit"] },
  // `next dev` appends a nextjs-agent-rules block to the tracked CLAUDE.md when an agent is detected
  agentRules: false,
};

// R-009-25: `page.dev.tsx` (the /_design route) is a page only under `next dev`; build/start never see the file.
export default (phase) => ({
  ...nextConfig,
  pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
});
