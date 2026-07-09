import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@paddockboard/db", "@paddockboard/shared"],
};

export default nextConfig;
