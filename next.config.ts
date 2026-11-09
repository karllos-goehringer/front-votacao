import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o dev server para celulares/outros PCs da rede local (ex.: http://192.168.0.144:3000).
  allowedDevOrigins: ["192.168.0.144", "192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
