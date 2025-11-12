# Alerta Chart - Setup Guide

Kapsamlı kurulum rehberi: Web uygulaması + Mobil uygulama + Push notification sistemi

## 📋 İçindekiler

1. [Backend Setup](#backend-setup)
2. [Database Setup](#database-setup)
3. [Web App Setup](#web-app-setup)
4. [Mobile App Setup](#mobile-app-setup)
5. [Push Notification Setup](#push-notification-setup)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## 1. Backend Setup

### Gereksinimler

- Node.js 18+ ve npm
- Neon PostgreSQL database hesabı
- (Opsiyonel) Expo hesabı

### Adımlar

```bash
# 1. Repository'yi clone edin
git clone <repository-url>
cd alertachart

# 2. Bağımlılıkları yükleyin
npm install

# 3. Environment variables oluşturun
cp .env.example .env.local
```

### Environment Variables

`.env.local` dosyasını düzenleyin:

```bash
# Neon Database URL
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Expo Push Notifications (Opsiyonel)
EXPO_ACCESS_TOKEN=your-expo-access-token-here
```

---

## 2. Database Setup

### Neon Database Oluşturma

1. [Neon Console](https://console.neon.tech)'a gidin
2. "Create a project" tıklayın
3. Connection string'i kopyalayın
4. `.env.local` dosyasına ekleyin

### Database Tablolarını Oluşturma

Tablolar otomatik oluşturulur (ilk API çağrısında). Manuel oluşturmak isterseniz:

```bash
# Backend'i başlatın
npm run dev

# Veya SQL script'ini çalıştırın (opsiyonel)
# Neon console'da aşağıdaki SQL'i çalıştırın
```

```sql
-- devices tablosu
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  expo_push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- price_alerts tablosu
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  proximity_delta DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  last_price DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- alarm_subscriptions tablosu
CREATE TABLE IF NOT EXISTS alarm_subscriptions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  alarm_key VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, alarm_key),
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_device_id ON price_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alarm_subscriptions_device_id ON alarm_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_alarm_subscriptions_alarm_key ON alarm_subscriptions(alarm_key);
```

---

## 3. Web App Setup

### Development

```bash
# Ana dizinde
npm run dev

# Tarayıcıda aç
open http://localhost:3000
```

### Build (Production)

```bash
npm run build
npm start
```

### Features Test

1. **Chart**: Ana sayfada cryptocurrency chart'ları görünmeli
2. **Alerts**: Fiyat uyarısı oluşturun ve tetiklemeyi test edin
3. **WebSocket**: Canlı fiyat güncellemeleri akmalı

---

## 4. Mobile App Setup

### Gereksinimler

- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS: Mac + Xcode
- Android: Android Studio (opsiyonel)

### Adımlar

```bash
# Mobile klasörüne gidin
cd mobile

# Bağımlılıkları yükleyin
npm install

# Expo/EAS giriş
eas login

# EAS projesi konfigürasyonu
eas build:configure
```

### Konfigürasyon

#### 1. `app.json` - Project ID

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR_ACTUAL_EAS_PROJECT_ID"
      }
    }
  }
}
```

EAS Project ID'nizi [Expo Dashboard](https://expo.dev/)'dan alın.

#### 2. `src/services/notifications.ts` - Project ID

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'YOUR_ACTUAL_EAS_PROJECT_ID',
});
```

#### 3. Development için Backend URL

`src/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:3000/api'  // Bilgisayarınızın local IP'si
  : 'https://alerta.kriptokirmizi.com/api';
```

IP adresinizi öğrenmek için:
- Mac: System Preferences → Network
- Windows: `ipconfig`
- Linux: `ifconfig`

`src/components/AppWebView.tsx`:
```typescript
const WEBVIEW_URL = __DEV__
  ? 'http://192.168.1.100:3000'
  : 'https://alerta.kriptokirmizi.com';
```

### Development'ta Çalıştırma

```bash
# Expo sunucusunu başlat
npm start

# iOS simulator (Mac)
npm run ios

# Android emulator
npm run android

# QR kod ile fiziksel cihazda (Expo Go)
# QR kodu Expo Go uygulamasıyla tarayın
```

### Production Build

```bash
# Development build (test için)
eas build --profile development --platform all

# Preview build (APK - Android test)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform all
```

Build tamamlandıktan sonra QR kod veya download link gelir.

---

## 5. Push Notification Setup

### 1. Backend'de Expo Server SDK

Zaten kurulu. Eğer hata alırsanız:

```bash
npm install expo-server-sdk
```

### 2. Fiyat Yaklaşma Servisini Başlatma

Sunucu başladıktan sonra:

```bash
curl -X POST http://localhost:3000/api/push/service/start
```

Veya otomatik başlatma için `app/page.tsx` içine:

```typescript
useEffect(() => {
  // Fiyat yaklaşma servisini başlat
  fetch('/api/push/service/start', { method: 'POST' })
    .catch(console.error);
}, []);
```

### 3. Test Push Notification

Mobil uygulamayı açın ve konsoldan device ID'yi kopyalayın:

```bash
# Test push gönder
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "DEVICE_ID_HERE"}'
```

Mobil cihazınızda bildirim görünmeli!

---

## 6. Testing

### Backend Test

```bash
# Health check
curl http://localhost:3000/api/health

# Push register
curl -X POST http://localhost:3000/api/push/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-123",
    "expoPushToken": "ExponentPushToken[test]",
    "platform": "ios",
    "appVersion": "1.0.0"
  }'

# Test notification
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-123"}'
```

### Fiyat Uyarısı Test

```bash
# 1. Uyarı oluştur
curl -X POST http://localhost:3000/api/alerts/price \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-123",
    "symbol": "BTCUSDT",
    "targetPrice": 106000,
    "proximityDelta": 200,
    "direction": "up"
  }'

# 2. Servisi başlat
curl -X POST http://localhost:3000/api/push/service/start

# 3. Fiyat 105,800 - 106,000 arasına geldiğinde bildirim gelecek
```

### Alarm Test

```bash
# Web'de alarm oluşturun ve tetikleyin
# Veya manuel test:
curl -X POST http://localhost:3000/api/alarms/notify \
  -H "Content-Type: application/json" \
  -d '{
    "alarmKey": "test-alarm",
    "symbol": "BTCUSDT",
    "message": "BTC 106,000$ seviyesine ulaştı!"
  }'
```

---

## 7. Deployment

### Backend (Vercel)

```bash
# Vercel'e deploy
vercel

# Environment variables ekle
vercel env add DATABASE_URL
vercel env add EXPO_ACCESS_TOKEN

# Production deploy
vercel --prod
```

### Backend (Diğer platformlar)

- **Railway**: `railway up`
- **Render**: GitHub repo bağlayın
- **AWS/Azure**: Docker container kullanın

### Mobile (Stores)

#### iOS App Store

```bash
# Build
eas build --profile production --platform ios

# Submit
eas submit --platform ios
```

App Store Connect'e gidin ve review için gönderin.

#### Google Play Store

```bash
# Build
eas build --profile production --platform android

# Submit
eas submit --platform android
```

Play Console'a gidin ve review için gönderin.

---

## 🔧 Troubleshooting

### Backend çalışmıyor

- `node_modules` silin ve `npm install` yapın
- `.env.local` dosyasını kontrol edin
- Port 3000 kullanımda mı kontrol edin: `lsof -i :3000`

### Database bağlanamıyor

- Neon Console'da database'in aktif olduğunu kontrol edin
- Connection string'i test edin
- SSL mode'un `require` olduğundan emin olun

### Push notification gelmiyor

- Device ID'nin kaydedildiğini kontrol edin
- Token'ın geçerli olduğunu kontrol edin
- Expo status: https://status.expo.dev/
- Mobil cihazda notification izinlerini kontrol edin

### Mobile build hatası

- `eas build:configure` tekrar çalıştırın
- `mobile/node_modules` silin ve yeniden yükleyin
- EAS documentation'a bakın: https://docs.expo.dev/build/introduction/

---

## 📚 Daha Fazla Dokümantasyon

- [Mobile README](mobile/README.md) - Mobil uygulama detayları
- [Push Notifications](PUSH_NOTIFICATIONS.md) - Push sistemi detayları
- [Main README](README.md) - Genel proje bilgisi

---

## ✅ Kurulum Checklist

Backend:
- [ ] Node.js ve npm kurulu
- [ ] Neon database oluşturuldu
- [ ] `.env.local` yapılandırıldı
- [ ] `npm install` çalıştırıldı
- [ ] `npm run dev` çalışıyor
- [ ] Database tabloları oluştu

Mobile:
- [ ] Expo CLI kurulu
- [ ] EAS hesabı oluşturuldu
- [ ] `mobile/` klasöründe `npm install` yapıldı
- [ ] `app.json` project ID güncellendi
- [ ] Backend URL güncellendi (development)
- [ ] `npm start` çalışıyor

Push Notifications:
- [ ] Push servisi başlatıldı
- [ ] Test push çalışıyor
- [ ] Fiyat uyarısı oluşturuldu
- [ ] Alarm tetikleme test edildi

Production:
- [ ] Backend deploy edildi
- [ ] Environment variables ayarlandı
- [ ] Mobile app build alındı
- [ ] Store'lara submit edildi (opsiyonel)

---

Tebrikler! 🎉 Alerta Chart sisteminiz hazır. Sorularınız için dokümantasyona bakın veya issue açın.


