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
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      // iOS için iOS OAuth client ID (Google Cloud Console'dan oluşturuldu)
      clientId: '776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    WebViewController: {},
  },
};

export default config;
