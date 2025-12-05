const { withContentlayer } = require("next-contentlayer2");
const createNextIntlPlugin = require("next-intl/plugin");

import("./env.mjs");

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  serverExternalPackages: ["@prisma/client"],
  // Increase server action body size limit to 8MB for image uploads (base64 encoding adds ~33% overhead)
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

module.exports = withNextIntl(withContentlayer(nextConfig));
