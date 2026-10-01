/** @type {import("next").NextConfig} */
const nextConfig = {
  // e2e builds the production bundle into its own dir so it never clobbers the dev server's .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  transpilePackages: ["@vck/ui-kit"],
  // webpack keeps the barrel's "use client" Reveal/Stagger in the layout chunk without this (+39 KB gz); Turbopack uses sideEffects
  experimental: { optimizePackageImports: ["@vck/ui-kit"] },
};

export default nextConfig;
