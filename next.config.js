/** @type {import('next').NextConfig} */
const nextConfig = {
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
