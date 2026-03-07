import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@takomi/contracts"],
};

export default nextConfig;
