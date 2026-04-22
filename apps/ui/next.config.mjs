/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/api"],
  logging: {
    serverFunctions: false,
  },
  experimental: {
    /** Enables `unauthorized()` from `next/navigation` (e.g. preview share token checks). */
    authInterrupts: true,
  },
};

export default nextConfig;
