import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP only: measured on the hero photographs, AVIF at the same quality setting
    // loses about a sixth of the fine detail; WebP keeps nearly all of it.
    formats: ["image/webp"],
    qualities: [75, 85],
    // Steps between 2048 and 3840, so a phone or laptop needing ~2,300px is sent 2560 rather than
    // 3840: never fewer pixels than it draws, far fewer to download and decode while scrolling.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3072, 3840],
  },
  devIndicators: false,
};

export default nextConfig;
