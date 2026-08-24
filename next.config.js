import path from "path";

// Lazy import Sentry hanya jika DSN dikonfigurasi — menghemat ~30-50MB RAM saat Sentry tidak dipakai
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let withSentryConfig;
if (sentryDsn) {
  const sentryModule = await import("@sentry/nextjs");
  withSentryConfig = sentryModule.withSentryConfig;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const appHostname = new URL(appUrl).hostname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Order routes (Public Visitor Checkout)
      { source: '/api/orders/:path+', destination: '/endpoints/order/orders/:path+' },
      { source: '/api/orders', destination: '/endpoints/order/orders' },
      
      // Post routes (Public Visitor Testimonials)
      { source: '/api/testimonials/:path*', destination: '/endpoints/post/testimonials/:path*' },
      
      // Shared / Utility routes
      { source: '/api/openapi/:path*', destination: '/endpoints/shared/openapi/:path*' },
      
      // Site routes (Public Health Check & Contact)
      { source: '/api/contact/:path*', destination: '/endpoints/site/contact/:path*' },
      { source: '/api/health/:path*', destination: '/endpoints/site/health/:path*' },
      
      // Subscription cron check route
      { source: '/api/cron/:path*', destination: '/endpoints/subscription/cron/:path*' },
      
      // Page editor helper routes
      { source: '/api/credbuild/:path*', destination: '/endpoints/page/credbuild/:path*' },
      { source: '/api/ai/:path*', destination: '/endpoints/ai/:path*' },

      // Catch-all mapping untuk sisa /api/* ke /endpoints/*
      { source: '/api/:path*', destination: '/endpoints/:path*' },
    ];
  },
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ["lucide-react", "@crediblemark/build-ui", "@crediblemark/build-ai", "@crediblemark/starsender"],
  typescript: {
    // Type checking is enforced in production builds
  },
  images: {
    // Aktifkan optimasi — sharp sudah terinstall di package.json
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "cdn.univedpress.id",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "http",
        hostname: appHostname,
      },
      {
        protocol: "https",
        hostname: "file.situsbisnis.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: appHostname,
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["@prisma/client", "ioredis"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@crediblemark/build",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@aws-sdk/client-s3",
      "zod",
      "clsx",
      "tailwind-merge",
      "react-hot-toast"
    ],
    // Naikkan stale time agar browser tidak terlalu sering re-fetch
    staleTimes: { dynamic: 300, static: 3600 },
    webpackMemoryOptimizations: true,
    serverSourceMaps: false
  },
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "lucide-react/dynamicIconImports": "lucide-react/dynamicIconImports.mjs",
      "isomorphic-dompurify": "./src/lib/dompurify-mock.ts",
    },
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ignored: ["**/node_modules", "**/public", "**/.git", "**/.next"],
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@crediblemark/build': path.resolve('./node_modules/@crediblemark/build'),
      'isomorphic-dompurify': path.resolve('./src/lib/dompurify-mock.ts'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
      config.resolve.alias['react'] = path.resolve('./node_modules/react');
      config.resolve.alias['react-dom'] = path.resolve('./node_modules/react-dom');
    }

    return config;
  },
};

// Hanya wrap dengan Sentry jika DSN dikonfigurasi — mencegah bundling Sentry SDK yang berat saat tidak dipakai
export default withSentryConfig 
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || "",
      project: process.env.SENTRY_PROJECT || "",
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
    })
  : nextConfig;