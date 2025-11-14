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
};

export default config;
