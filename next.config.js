/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output for Capacitor (static export)
  // TEMPORARILY DISABLED - API routes prevent static export
  // output: 'export',
  // distDir: 'out',
  // images: {
  //   unoptimized: true, // Required for static export
  // },
  
  // Disable ESLint during build to prevent warnings from blocking deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable source maps in production to hide file sources
  productionBrowserSourceMaps: false,
  
  // Remove React DevTools in production
  compiler: {
    // TEMPORARILY DISABLED FOR DEBUGGING
    // removeConsole: {
    //   exclude: ['error', 'warn'], // Only keep errors and warnings
    // },
    reactRemoveProperties: true, // Remove test IDs and data attributes
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  webpack: (config, { dev, isServer }) => {
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' },
    });
    
    // Ignore Capacitor IAP plugin in web builds (only available in native apps)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@capacitor-community/in-app-purchase': false,
    };
    
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
