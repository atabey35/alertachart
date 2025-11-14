import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kriptokirmizi.alerta',
  appName: 'Alerta Chart',
  webDir: 'public', // Simple public folder for index redirect
  server: {
    // Point to Vercel production URL
    url: 'https://alertachart.com',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
