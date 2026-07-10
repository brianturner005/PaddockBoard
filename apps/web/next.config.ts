import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@paddockboard/db", "@paddockboard/shared", "@paddockboard/parsers"],
};

export default nextConfig;
