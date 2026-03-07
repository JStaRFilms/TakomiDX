import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@takomi/contracts", "zod"],
};

export default nextConfig;
