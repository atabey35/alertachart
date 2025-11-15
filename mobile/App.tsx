import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Platform, Alert, Share, TouchableOpacity, Text, Modal, ScrollView, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import AppWebView from './src/components/AppWebView';
import { 
  setupNotificationHandler, 
  registerForPushNotifications,
  setupNotificationListeners,
  checkNotificationPermissions
} from './src/services/notifications';
import { registerPushToken, registerNativeDevice, linkDevice } from './src/services/api';
import { getOrCreateDeviceId } from './src/utils/deviceId';
import { saveAuthToken, getAuthToken, clearAuthTokens } from './src/utils/auth';

// Splash screen'i başlangıçta tut
SplashScreen.preventAutoHideAsync();

// App version - sabit değer (expo-application production build'de sorunlu)
const APP_VERSION = '1.0.0';

// Aggr WebView URL - kkaggr projenizi deploy ettiğiniz URL
// Örnek: 'https://aggr.kriptokirmizi.com' veya Railway/Vercel URL'niz
// Development için: 'http://localhost:5173' (kkaggr-main'i npm run dev ile çalıştırın)
// TODO: Kendi deploy URL'nizi buraya yazın
const AGGR_URL = 'https://example.com/aggr'; // Placeholder URL

export default function App() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const notificationListener = useRef<any>(null);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    initializeApp();
  }, []);

  // Deep link listener for OAuth callback
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('[App] Deep link received:', event.url);
      addDebugLog(`Deep link: ${event.url}`);
      
      if (event.url.includes('auth/success')) {
        console.log('[App] OAuth success, reloading WebView');
        addDebugLog('OAuth success - reloading');
        // WebView will automatically pick up the new session
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[App] App opened with URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // 1. Notification handler'ı kur
      setupNotificationHandler();

      // 2. Device ID al/oluştur
      const devId = await getOrCreateDeviceId();
      setDeviceId(devId);
      const deviceLog = `Device ID: ${devId}`;
      console.log(deviceLog);
      addDebugLog(deviceLog);

      // 2.5. Auth token'ı yükle (varsa)
      const savedAuthToken = await getAuthToken();
      if (savedAuthToken) {
        setAuthToken(savedAuthToken);
        console.log('[App] Auth token loaded from storage');
        addDebugLog('Auth token loaded');
      }

      // 3. Push notification izni iste ve token al
      const token = await registerForPushNotifications();
      setPushToken(token);

      if (token) {
        const tokenLog = `Push token obtained: ${token}`;
        console.log(tokenLog);
        addDebugLog(tokenLog);

        // 4. 🔥 YENİ MİMARİ: Native cihaz kaydı - AUTH GEREKTİRMEZ
        // Login olmadan cihaz kaydı yap, login sonrası /api/devices/link ile kullanıcıya bağlanır
        const registered = await registerNativeDevice(
          devId,
          token,
          Platform.OS as 'ios' | 'android',
          APP_VERSION
        );

        if (registered) {
          const successLog = '✅ Native device registered (no auth required)';
          console.log(successLog);
          addDebugLog(successLog);
          
          // Eğer zaten auth token varsa, cihazı hemen kullanıcıya bağla
          if (savedAuthToken) {
            console.log('[App] Auth token exists, linking device to user...');
            const linked = await linkDevice(devId);
            if (linked) {
              console.log('[App] ✅ Device linked to user');
              addDebugLog('Device linked to user');
            } else {
              console.warn('[App] ⚠️ Failed to link device to user');
              addDebugLog('Failed to link device');
            }
          }
        } else {
          const errorLog = '❌ Failed to register native device';
          console.warn(errorLog);
          addDebugLog(errorLog);
        }
      } else {
        console.warn('⚠️ Push token not available');
        
        // Sadece Android'de ve izin verilmediyse uyarı göster
        const hasPermission = await checkNotificationPermissions();
        if (!hasPermission && Platform.OS === 'android') {
          // Kullanıcıya bilgi ver - ama uygulamayı bloklamadan
          setTimeout(() => {
        Alert.alert(
          'Bildirimler Kapalı',
          'Fiyat uyarıları ve alarm bildirimleri almak için bildirimleri açmanız gerekiyor.',
          [
            { text: 'Sonra', style: 'cancel' },
            { text: 'Ayarlar', onPress: () => {
                  Linking.openSettings();
            }},
          ]
        );
          }, 2000); // 2 saniye bekle, böylece uygulama yüklenmiş olur
        }
      }

      // 5. Notification listener'ları kur
      const cleanup = setupNotificationListeners(
        (notification) => {
          // Foreground'da bildirim geldi
          console.log('Notification received (foreground):', notification);
        },
        (response) => {
          // Bildirime tıklandı
          console.log('Notification tapped:', response);
          handleNotificationTap(response);
        }
      );

      notificationListener.current = cleanup;

      // 6. Hazır!
      setIsReady(true);
      await SplashScreen.hideAsync();
    } catch (error) {
      console.error('App initialization error:', error);
      setIsReady(true);
      await SplashScreen.hideAsync();
    }
  };

  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    addDebugLog(`Notification tapped: ${JSON.stringify(data)}`);
    
    // Notification data'ya göre yönlendirme yapılabilir
    if (data?.type === 'price_alert' && data?.symbol) {
      console.log(`Navigate to ${data.symbol} chart`);
      // WebView'a mesaj gönderilebilir veya URL değiştirilebilir
    } else if (data?.type === 'alarm') {
      console.log('Navigate to alarms page');
    }
  };

  const handleScreenTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 500) {
      tapCount.current += 1;
    } else {
      tapCount.current = 1;
    }
    lastTapTime.current = now;

    // 3 kez hızlıca dokununca debug modal aç
    if (tapCount.current >= 3) {
      setShowDebugModal(true);
      tapCount.current = 0;
    }
  };

  const shareLogs = async () => {
    const logText = [
      `=== Alerta Debug Logs ===`,
      `Platform: ${Platform.OS}`,
      `App Version: ${APP_VERSION}`,
      `Device ID: ${deviceId || 'N/A'}`,
      `Push Token: ${pushToken || 'N/A'}`,
      ``,
      `=== Logs ===`,
      ...debugLogs,
    ].join('\n');

    try {
      await Share.share({
        message: logText,
        title: 'Alerta Debug Logs',
      });
    } catch (error) {
      console.error('Error sharing logs:', error);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup notification listeners
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, []);

  if (!isReady) {
    return null; // Splash screen gösteriliyor
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity 
        style={styles.invisibleTapArea}
        activeOpacity={1}
        onPress={handleScreenTap}
      >
      <AppWebView
        pushToken={pushToken}
        deviceId={deviceId}
        authToken={authToken}
        onAuthToken={async (token) => {
          console.log('[App] Auth token received from WebView:', token);
          await saveAuthToken(token);
          setAuthToken(token);
          addDebugLog('Auth token saved');
          
          // 🔥 YENİ MİMARİ: Login sonrası cihazı kullanıcıya bağla
          if (deviceId) {
            console.log('[App] Linking device to user after login...');
            const linked = await linkDevice(deviceId);
            if (linked) {
              console.log('[App] ✅ Device linked to user');
              addDebugLog('Device linked to user');
            } else {
              console.warn('[App] ⚠️ Failed to link device to user');
              addDebugLog('Failed to link device');
            }
          }
        }}
        onNavigationStateChange={(navState) => {
            const navLog = `Navigation: ${navState.url}`;
            console.log(navLog);
            addDebugLog(navLog);
        }}
        onError={(error) => {
            const errorLog = `WebView error: ${error}`;
            console.error(errorLog);
            addDebugLog(errorLog);
          }}
        />
      </TouchableOpacity>

      {/* Debug Modal */}
      <Modal
        visible={showDebugModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDebugModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Debug Logs</Text>
              <TouchableOpacity onPress={() => setShowDebugModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.logsContainer}>
              <Text style={styles.infoText}>
                Platform: {Platform.OS}{'\n'}
                Device ID: {deviceId || 'N/A'}{'\n'}
                Push Token: {pushToken ? `${pushToken.substring(0, 30)}...` : 'N/A'}
              </Text>
              <Text style={styles.logsText}>
                {debugLogs.length > 0 ? debugLogs.join('\n') : 'Henüz log yok'}
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.shareButton} onPress={shareLogs}>
                <Text style={styles.shareButtonText}>📤 Logları Paylaş</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  invisibleTapArea: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logsContainer: {
    maxHeight: 400,
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  infoText: {
    color: '#0f0',
    fontSize: 12,
    marginBottom: 10,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  logsText: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    minWidth: 150,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
