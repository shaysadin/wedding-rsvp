const { withContentlayer } = require("next-contentlayer2");
const createNextIntlPlugin = require("next-intl/plugin");

import("./env.mjs");

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
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
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com", // R2 private storage
      },
      {
        protocol: "https",
        hostname: "*.r2.dev", // R2 public storage for invitations
      },
    ],
  },

  // Remove console logs in production for cleaner output
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          // HSTS: Force HTTPS for 1 year including subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP: Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.r2.cloudflarestorage.com https://*.r2.dev https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://images.unsplash.com https://randomuser.me",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://accounts.google.com https://res.cloudinary.com https://sdk.twilio.com https://*.twilio.com wss://*.twilio.com",
              "frame-src 'self' https://js.stripe.com https://accounts.google.com",
              "media-src 'self' https://res.cloudinary.com https://sdk.twilio.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

  serverExternalPackages: ["@prisma/client"],

  // Server actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb", // Increased for PDF uploads (20MB PDF + 33% base64 overhead)
    },
  },
};

module.exports = withNextIntl(withContentlayer(nextConfig));
