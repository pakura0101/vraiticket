/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // ← REQUIRED

  experimental: {},

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
