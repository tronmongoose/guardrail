import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@guide-rail/shared", "@guide-rail/ai"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
