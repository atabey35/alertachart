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
      // Android: Android client ID kullan
      // iOS: iOS client ID kullan (Web client ID custom scheme URI'leri desteklemez)
      // NOT: Runtime'da AndroidLogin.tsx ve IOSLogin.tsx'de doğru client ID kullanılıyor
      // Bu config sadece fallback olarak kullanılabilir
      clientId: '776781271347-fgnaoenplt1lnnmjivcagc013fa01ch1.apps.googleusercontent.com', // Android client ID
      forceCodeForRefreshToken: true,
    },
    WebViewController: {},
  },
};

export default config;
