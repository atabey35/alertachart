import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kriptokirmizi.alerta',
  appName: 'Alerta Chart',
  webDir: 'public', // Local login screen
  // No server.url - use local files for auth, then redirect to remote
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
