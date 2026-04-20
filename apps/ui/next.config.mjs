/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/api"],
  logging: {
    serverFunctions: false,
  },
};

export default nextConfig;
