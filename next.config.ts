import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory otherwise confuses root detection.
  outputFileTracingRoot: import.meta.dirname,
  // Lets a production build run alongside `next dev` without clobbering .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
