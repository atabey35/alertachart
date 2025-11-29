import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kriptokirmizi.alerta',
  appName: 'Alerta Chart',
  webDir: 'public', // Fallback for offline/first launch
  
  // ✅ PRODUCTION MODE: Load from live website (always fresh content)
  server: {
    url: 'https://www.alertachart.com',
    cleartext: false, // HTTPS only for production
    androidScheme: 'https',
    iosScheme: 'https'
  },
  
  // 🧪 LOCAL DEV MODE: Change url to your local IP for hot-reload testing
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:3000',
  //   cleartext: true,
  //   androidScheme: 'https',
  // },
  
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com',
      clientId: '776781271347-fgnaoenplt1lnnmjivcagc013fa01ch1.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    WebViewController: {
      allowBackForwardNavigationGestures: false,
    },
  },
};

export default config;
