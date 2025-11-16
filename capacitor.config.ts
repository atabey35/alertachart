import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kriptokirmizi.alerta',
  appName: 'Alerta Chart',
  webDir: 'public', // Local login screen
  server: {
    url: 'https://alertachart.com',
    cleartext: true, // Allow HTTP if needed
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // 🔥 CRITICAL: serverClientId her zaman Web client ID (backend token exchange için)
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      // 🔥 CRITICAL: clientId platform-specific olmalı
      // Android: Web client ID kullan
      // iOS: iOS client ID kullan (Web client ID custom scheme URI'leri desteklemez)
      clientId: '776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i.apps.googleusercontent.com', // iOS client ID
      forceCodeForRefreshToken: true,
    },
    WebViewController: {},
  },
};

export default config;
