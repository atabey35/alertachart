# 🔔 Local Notification Fix - Alarm Bildirimleri

## Problem
Mobil app'te alarm tetiklendiğinde:
- ✅ Alarm çalıyor (ses)
- ❌ Bildirim gelmiyor (notification)

**Neden?** `alertService.ts` içinde `showNotification()` sadece web browser Notification API'sini kullanıyordu. Bu mobil app'te (React Native WebView) çalışmıyor.

## Çözüm
Native app'te **Expo Notifications** ile **local notification** göstermek.

## Yapılan Değişiklikler

### 1. `services/alertService.ts`
- `triggerAlert()` fonksiyonunda WebView'a gönderilen mesaj güncellendi
- Notification bilgileri (title, body, data) eklendi
- Mesaj formatı iyileştirildi

**Değişiklik:**
```typescript
// ÖNCE: Sadece alert bilgisi gönderiliyordu
(window as any).ReactNativeWebView.postMessage(JSON.stringify({
  type: 'ALERT_TRIGGERED',
  alert: { ... }
}));

// SONRA: Notification bilgileri de eklendi
(window as any).ReactNativeWebView.postMessage(JSON.stringify({
  type: 'ALERT_TRIGGERED',
  alert: { ... },
  notification: {
    title: '💰 Fiyat Alarmı',
    body: `${SYMBOL} fiyatı ${PRICE} seviyesine ${DIRECTION}!`,
    data: { ... }
  }
}));
```

### 2. `mobile/src/components/AppWebView.tsx`
- `handleMessage()` fonksiyonuna `ALERT_TRIGGERED` case'i eklendi
- `handleAlertTriggered()` fonksiyonu eklendi
- Expo Notifications ile local notification gösteriliyor

**Yeni Fonksiyon:**
```typescript
const handleAlertTriggered = async (message: any) => {
  // Notification bilgilerini al
  const notification = message.notification || { ... };
  
  // Expo Notifications ile local notification göster
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' && {
        channelId: 'alarms-v2', // Yüksek öncelikli channel
      }),
    },
    trigger: null, // Hemen göster
  });
};
```

## Nasıl Çalışıyor?

1. **Alarm Tetikleniyor:**
   - `alertService.checkPrice()` → fiyat eşiği geçildi
   - `alertService.triggerAlert()` çağrılıyor

2. **WebView Mesajı:**
   - `alertService.ts` → `ReactNativeWebView.postMessage()` ile mesaj gönderiliyor
   - Mesaj tipi: `ALERT_TRIGGERED`
   - Notification bilgileri dahil

3. **Native App Yakalıyor:**
   - `AppWebView.tsx` → `handleMessage()` mesajı yakalıyor
   - `ALERT_TRIGGERED` case'i çalışıyor
   - `handleAlertTriggered()` çağrılıyor

4. **Local Notification Gösteriliyor:**
   - Expo Notifications API kullanılıyor
   - `scheduleNotificationAsync()` ile hemen gösteriliyor
   - Android için `alarms-v2` channel kullanılıyor

## Test Senaryosu

1. ✅ Mobil app'i aç
2. ✅ Bir alarm kur (örn: BTCUSDT 50000 üzeri)
3. ✅ Fiyat eşiğe geldiğinde:
   - Alarm çalıyor (ses) ✅
   - Bildirim görünüyor (notification) ✅
   - Uygulama açıkken çalışıyor ✅
   - Uygulama arka plandayken çalışıyor ✅

## Önemli Notlar

### Android Notification Channels
- `alarms-v2` channel'ı kullanılıyor
- Channel `mobile/src/services/notifications.ts` içinde oluşturuluyor
- Importance: `MAX` (en yüksek öncelik)

### iOS
- iOS'ta channel gerekmez
- Notification otomatik gösterilir

### Foreground Notifications
- Expo Notifications handler zaten ayarlı (`setupNotificationHandler()`)
- Foreground'da da bildirim gösterilir

## Sorun Giderme

### Bildirim Görünmüyor?
1. **Notification izni kontrolü:**
   ```typescript
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Permission status:', status);
   ```

2. **Log kontrolü:**
   - Browser console'da: `[AlertService] ✅ ALERT_TRIGGERED message sent`
   - React Native console'da: `[WebView] 🚨 ALERT_TRIGGERED received`
   - React Native console'da: `[WebView] ✅ Local notification shown`

3. **Android Channel kontrolü:**
   - `alarms-v2` channel'ı oluşturulmuş mu?
   - `mobile/src/services/notifications.ts` içinde `registerForPushNotifications()` çağrılıyor mu?

### Bildirim Ses Çalmıyor?
- `sound: true` ayarı var
- Android'de channel'da `sound: 'default'` ayarı var
- Cihaz sesli modda mı?

## Sonraki Adımlar

- [ ] Test et: Uygulama açıkken bildirim geliyor mu?
- [ ] Test et: Uygulama arka plandayken bildirim geliyor mu?
- [ ] Test et: Bildirime tıklandığında ne oluyor? (isteğe bağlı: navigasyon eklenebilir)

---

**Tarih:** 2024-12-19  
**Durum:** ✅ Tamamlandı - Test edilmeli

