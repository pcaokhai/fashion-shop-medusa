/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vck/ui-kit"],
  // webpack keeps the barrel's "use client" Reveal/Stagger in the layout chunk without this (+39 KB gz); Turbopack uses sideEffects
  experimental: { optimizePackageImports: ["@vck/ui-kit"] },
};

export default nextConfig;
