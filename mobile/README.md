# Alerta Mobile App

iOS ve Android için Expo tabanlı mobil uygulama. WebView üzerinden `alerta.kriptokirmizi.com` sitesini gösterir ve push notification desteği sağlar.

## 📱 Özellikler

- **WebView Entegrasyonu**: Tam özellikli web uygulamasını mobilde kullanın
- **Push Notifications**: Fiyat uyarıları ve alarm bildirimleri
- **Native Bridge**: Web ↔ Native iletişim köprüsü
- **Foreground/Background Support**: Her durumda bildirim alın
- **Pull-to-Refresh**: Sayfayı aşağı çekerek yenileyin
- **iOS/Android Uyumlu**: Her iki platform için optimize

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+ ve npm/yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- iOS için: Mac + Xcode
- Android için: Android Studio (opsiyonel)

### Adımlar

```bash
# Bağımlılıkları yükle
cd mobile
npm install

# Expo/EAS giriş yap
eas login

# EAS projesi oluştur (ilk seferinde)
eas build:configure

# Development sunucusu başlat
npm start

# iOS simulator'de çalıştır (Mac)
npm run ios

# Android emulator'de çalıştır
npm run android
```

## 🔧 Konfigürasyon

### 1. Expo Project ID

`app.json` dosyasında `extra.eas.projectId` değerini EAS projenizin ID'si ile değiştirin:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

### 2. Push Notification Setup

`src/services/notifications.ts` dosyasında project ID'yi güncelleyin:

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-actual-project-id',
});
```

### 3. Backend URL (Development)

Development sırasında local backend'e bağlanmak için:

`src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://192.168.1.100:3000/api'; // Bilgisayarınızın IP'si
```

`src/components/AppWebView.tsx`:
```typescript
const WEBVIEW_URL = 'http://192.168.1.100:3000'; // Local web
```

### 4. iOS Bundle ID & Android Package

`app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.kriptokirmizi.alerta"
  },
  "android": {
    "package": "com.kriptokirmizi.alerta"
  }
}
```

## 📦 Build (Production)

### Development Build

```bash
# iOS için development build
eas build --profile development --platform ios

# Android için development build
eas build --profile development --platform android

# Her ikisi için
eas build --profile development --platform all
```

### Production Build

```bash
# iOS için production build
eas build --profile production --platform ios

# Android için production build (APK)
eas build --profile preview --platform android

# Android için production build (AAB - Play Store)
eas build --profile production --platform android
```

### APK İndirme

Preview build tamamlandıktan sonra EAS dashboard'dan veya CLI ile APK'yı indirebilirsiniz:

```bash
# Son build'i indir
eas build:list

# Specific build ID ile indir
eas build:download --id <BUILD_ID>
```

## 🧪 Test

### Test Push Notification

Uygulamayı açın ve device ID'yi konsoldan kopyalayın:

```bash
# Backend'de test push gönder
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "your-device-id-here"}'
```

### Debugging

- **iOS**: Xcode → Window → Devices and Simulators → Console
- **Android**: Android Studio → Logcat veya `adb logcat`
- **Expo**: `npx expo start --dev-client` ve Expo Go app

## 📱 Store Yayınlama

### iOS App Store

1. Apple Developer hesabı gerekli
2. EAS'da Apple credentials ekleyin:
   ```bash
   eas credentials
   ```
3. Build alın:
   ```bash
   eas build --profile production --platform ios
   ```
4. Submit edin:
   ```bash
   eas submit --platform ios
   ```

### Google Play Store

1. Google Play Developer hesabı gerekli
2. Keystore oluşturun (EAS otomatik yapar)
3. Build alın:
   ```bash
   eas build --profile production --platform android
   ```
4. Submit edin:
   ```bash
   eas submit --platform android
   ```

## 🔔 Push Notification Flow

1. **App Açılış**: 
   - Push izni istenir
   - Expo push token alınır
   - Backend'e `/api/push/register` ile kayıt yapılır

2. **Fiyat Uyarısı**:
   - Web üzerinden veya backend'den fiyat uyarısı oluşturulur
   - Fiyat hedefe yaklaştığında backend push gönderir
   - Mobil cihazda bildirim görünür

3. **Alarm Tetikleme**:
   - Web'de alarm tetiklenir
   - Backend'e `/api/alarms/notify` çağrısı yapılır
   - Tüm ilgili cihazlara push gönderilir

## 🐛 Troubleshooting

### Push bildirimleri gelmiyor

- Device ID'nin doğru kaydedildiğini kontrol edin
- Backend'de `DATABASE_URL` ayarlandığından emin olun
- Test push endpoint'ini kullanarak test edin
- iOS için: Settings → Notifications → Alerta → izinleri kontrol edin
- Android için: Settings → Apps → Alerta → Notifications

### WebView yüklenmiyor

- İnternet bağlantısını kontrol edin
- Backend URL'in doğru olduğundan emin olun
- CORS ayarlarını kontrol edin (production'da gerekli değil)

### Build hatası

- `node_modules` ve `ios/Pods` klasörlerini silin, yeniden yükleyin
- `eas build:configure` komutunu tekrar çalıştırın
- EAS documentation'ı kontrol edin

## 📚 Daha Fazla Bilgi

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)

## 📄 Lisans

MIT


