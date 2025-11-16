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
      // 🔥 CRITICAL: Android'de Web client ID kullanılmalı (hem serverClientId hem de clientId)
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      // Android için de Web client ID kullan (Android client ID değil)
      clientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    WebViewController: {},
  },
};

export default config;
