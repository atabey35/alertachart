import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Bildirim davranışını ayarla (foreground'da da göster)
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Push notification izni iste ve token al
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Android için notification channel'ları önce oluştur
    if (Platform.OS === 'android') {
      // Eski channel'ları sil (icon/rengin cache'lenmesini kırmak için)
      try {
        await Notifications.deleteNotificationChannelAsync('default');
        await Notifications.deleteNotificationChannelAsync('price-alerts');
        await Notifications.deleteNotificationChannelAsync('alarms');
        await Notifications.deleteNotificationChannelAsync('price-alerts-v2');
        await Notifications.deleteNotificationChannelAsync('alarms-v2');
      } catch (error) {
        console.log('Channel silme hatası (normal olabilir):', error);
      }

      // Yeni channel'ları oluştur (v2)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0a84ff',
      });

      // Fiyat uyarıları için özel channel (v2)
      await Notifications.setNotificationChannelAsync('price-alerts-v2', {
        name: 'Fiyat Uyarıları',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0a84ff',
        sound: 'default',
        description: 'Kripto para fiyat uyarıları',
      });

      // Alarm bildirimleri için channel (v2)
      await Notifications.setNotificationChannelAsync('alarms-v2', {
        name: 'Alarmlar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0a84ff',
        sound: 'default',
        description: 'Kripto alarm bildirimleri',
      });
    }

    // Mevcut izin durumunu kontrol et
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Current permission status:', existingStatus);
    let finalStatus = existingStatus;

    // İzin yoksa iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('Permission requested, new status:', status);
    }

    // İzin verilmediyse çık
    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted, status:', finalStatus);
      return null;
    }

    // Token al - EAS Project ID ile
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'f4eb3196-3d5b-4aa0-9d0f-6075466f4f12',
    });

    console.log('✅ Push token obtained:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
}

/**
 * Bildirim izin durumunu kontrol et
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

/**
 * Bildirim listener'ları kur
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
): () => void {
  // Foreground'da bildirim geldiğinde
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Bildirime tıklandığında
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  // Cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Test bildirimi göster (local)
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Bildirimi 📱',
      body: 'Push notification sistemi çalışıyor!',
      data: { test: true },
    },
    trigger: null, // Hemen göster
  });
}

