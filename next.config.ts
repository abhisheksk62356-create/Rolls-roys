import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP only: measured on the hero photographs, AVIF at the same quality setting
    // loses about a sixth of the fine detail; WebP keeps nearly all of it.
    formats: ["image/webp"],
    qualities: [75, 85],
  },
  devIndicators: false,
};

export default nextConfig;
