# Push Notification System Documentation

Alerta Chart için kapsamlı push notification sistemi. Mobil cihazlara fiyat uyarıları ve alarm bildirimleri gönderir.

## 🏗️ Mimari

```
┌─────────────────┐
│  Mobile App     │
│  (Expo)         │
└────────┬────────┘
         │ Push Token
         ▼
┌─────────────────────────────────────┐
│  Backend (Next.js)                   │
│                                      │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ API Routes   │  │ Push Service │ │
│  │              │  │ (Expo SDK)   │ │
│  └──────┬───────┘  └──────┬───────┘ │
│         │                 │         │
│         ▼                 ▼         │
│  ┌──────────────────────────────┐  │
│  │      Neon PostgreSQL         │  │
│  │  - devices                   │  │
│  │  - price_alerts              │  │
│  │  - alarm_subscriptions       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         │ Push Notification
         ▼
┌─────────────────┐
│  Mobile Device  │
│  Notification   │
└─────────────────┘
```

## 📊 Database Schema

### Devices Table
```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  expo_push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Price Alerts Table
```sql
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  proximity_delta DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) CHECK (direction IN ('up', 'down')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  last_price DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);
```

### Alarm Subscriptions Table
```sql
CREATE TABLE alarm_subscriptions (
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
```

## 🔌 API Endpoints

### 1. Push Token Yönetimi

#### POST /api/push/register
Mobil cihazdan push token'ı kaydet

**Request:**
```json
{
  "deviceId": "ios_1234567890_abc",
  "expoPushToken": "ExponentPushToken[xxxxx]",
  "platform": "ios",
  "appVersion": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "deviceId": "ios_1234567890_abc",
    "platform": "ios",
    "createdAt": "2025-11-02T10:00:00Z"
  }
}
```

#### POST /api/push/unregister
Push token'ı deaktive et

**Request:**
```json
{
  "deviceId": "ios_1234567890_abc"
}
```

#### POST /api/push/test
Test bildirimi gönder

**Request:**
```json
{
  "deviceId": "ios_1234567890_abc"
}
```

### 2. Fiyat Uyarıları

#### POST /api/alerts/price
Yeni fiyat uyarısı oluştur

**Request:**
```json
{
  "deviceId": "ios_1234567890_abc",
  "symbol": "BTCUSDT",
  "targetPrice": 106000,
  "proximityDelta": 200,
  "direction": "up"
}
```

**Açıklama:**
- `targetPrice`: Hedef fiyat (örn: 106,000 USD)
- `proximityDelta`: Yaklaşma aralığı (örn: 200 USD)
- `direction`: "up" veya "down"
- Fiyat 105,800 ile 106,000 arasına geldiğinde bildirim gönderilir

#### GET /api/alerts/price?deviceId=xxx
Cihaza ait tüm uyarıları getir

#### PATCH /api/alerts/price
Uyarıyı güncelle

**Request:**
```json
{
  "id": 1,
  "targetPrice": 107000,
  "isActive": true
}
```

#### DELETE /api/alerts/price
Uyarıyı sil

**Request:**
```json
{
  "id": 1,
  "deviceId": "ios_1234567890_abc"
}
```

### 3. Alarm Bildirimleri

#### POST /api/alarms/notify
Mevcut alarm sistemi tarafından çağrılır

**Request:**
```json
{
  "alarmKey": "alert-123",
  "symbol": "BTCUSDT",
  "message": "BTC 106,000$ seviyesine ulaştı!",
  "data": {
    "price": 106000,
    "direction": "above"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sent": 5
}
```

### 4. Servis Yönetimi

#### POST /api/push/service/start
Fiyat yaklaşma servisini başlat

#### GET /api/push/service/start
Servis durumunu kontrol et

#### POST /api/push/service/stop
Servisi durdur

## 🔄 Fiyat Yaklaşma Servisi

### Nasıl Çalışır?

1. **WebSocket Bağlantısı**: Her aktif symbol için Binance/Bybit WebSocket'e bağlanır
2. **Fiyat Takibi**: Gerçek zamanlı fiyat güncellemelerini dinler
3. **Alert Kontrolü**: Her 10 saniyede bir aktif alert'leri kontrol eder
4. **Bildirim Gönderimi**: Koşullar sağlandığında push notification gönderir

### Yaklaşma Mantığı

**Yukarı Yönlü (direction: "up")**:
```javascript
// Hedef: 106,000 USD
// Delta: 200 USD
// Bildirim aralığı: 105,800 - 106,000 USD

if (currentPrice >= 105800 && currentPrice < 106000) {
  sendNotification("BTC 106,000$ seviyesine yaklaşıyor!");
}
```

**Aşağı Yönlü (direction: "down")**:
```javascript
// Hedef: 105,000 USD
// Delta: 200 USD
// Bildirim aralığı: 105,000 - 105,200 USD

if (currentPrice > 105000 && currentPrice <= 105200) {
  sendNotification("BTC 105,000$ seviyesine iniyor!");
}
```

### Debouncing

- Her uyarı için minimum 30 dakika bekleme süresi
- Aynı uyarı için spam önleme
- Fiyat aralığın dışına çıkıp tekrar girdiğinde yeni bildirim

## 🚀 Deployment

### Environment Variables

`.env.local`:
```bash
# Neon Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Expo (Opsiyonel, rate limit için)
EXPO_ACCESS_TOKEN=your-expo-access-token
```

### Backend Başlatma

```bash
# Bağımlılıkları yükle
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

### Fiyat Servisi Başlatma

Sunucu başladıktan sonra:

```bash
curl -X POST http://localhost:3000/api/push/service/start
```

Veya otomatik başlatma için `app/page.tsx` veya başka bir global yere ekle:

```typescript
useEffect(() => {
  fetch('/api/push/service/start', { method: 'POST' })
    .then(() => console.log('Price proximity service started'))
    .catch(console.error);
}, []);
```

## 🧪 Testing

### 1. Token Kaydı Testi

```bash
curl -X POST http://localhost:3000/api/push/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "expoPushToken": "ExponentPushToken[test]",
    "platform": "ios",
    "appVersion": "1.0.0"
  }'
```

### 2. Test Push Testi

```bash
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device-123"}'
```

### 3. Fiyat Uyarısı Testi

```bash
# Uyarı oluştur
curl -X POST http://localhost:3000/api/alerts/price \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "symbol": "BTCUSDT",
    "targetPrice": 106000,
    "proximityDelta": 200,
    "direction": "up"
  }'

# Servisi başlat
curl -X POST http://localhost:3000/api/push/service/start

# Fiyat 105,800 ile 106,000 arasına geldiğinde bildirim gelecek
```

### 4. Alarm Bildirimi Testi

```bash
curl -X POST http://localhost:3000/api/alarms/notify \
  -H "Content-Type: application/json" \
  -d '{
    "alarmKey": "test-alarm-1",
    "symbol": "BTCUSDT",
    "message": "Test alarm tetiklendi!"
  }'
```

## 📱 Mobil Entegrasyon

### Native Tarafta (Expo)

```typescript
import { registerPushToken } from './services/api';
import { registerForPushNotifications } from './services/notifications';

// Token al ve kaydet
const token = await registerForPushNotifications();
const deviceId = await getOrCreateDeviceId();

await registerPushToken({
  deviceId,
  expoPushToken: token,
  platform: Platform.OS,
  appVersion: '1.0.0',
});
```

### Web Tarafta (Native Bridge)

```javascript
// Push token iste
window.requestPushToken();

// Event listener
window.addEventListener('nativeMessage', (event) => {
  if (event.detail.type === 'PUSH_TOKEN') {
    console.log('Push token:', event.detail.token);
  }
});
```

## 🔐 Güvenlik

### Rate Limiting

- Expo otomatik rate limiting uygular
- Günlük limitlere dikkat edin
- Production'da `EXPO_ACCESS_TOKEN` kullanın

### Token Güvenliği

- Push token'ları şifrelenmeden saklanabilir (zaten public)
- Device ID benzersiz ve anonim
- HTTPS kullanın (production)

### Spam Koruması

- 30 dakikalık debouncing
- Son bildirim zamanı takibi
- Aynı uyarı için tekrar kontrol

## 📊 Monitoring

### Log Takibi

```bash
# Backend logs
npm run dev

# Mobile logs (iOS)
npx expo start
# Sonra 'i' tuşuna basın

# Mobile logs (Android)
npx expo start
# Sonra 'a' tuşuna basın
```

### Metrics

- Kayıtlı cihaz sayısı: `SELECT COUNT(*) FROM devices WHERE is_active = true`
- Aktif uyarı sayısı: `SELECT COUNT(*) FROM price_alerts WHERE is_active = true`
- Gönderilen bildirimler: Backend loglarında `✅ Sent` mesajları

## 🐛 Troubleshooting

### Push gönderilmiyor

1. Device token'ın geçerli olduğunu kontrol edin
2. Database connection'ı test edin
3. Expo push service durumunu kontrol edin: https://status.expo.dev/
4. Token'ın geçerli bir Expo push token olduğundan emin olun

### Fiyat servisi çalışmıyor

1. WebSocket bağlantısını kontrol edin
2. Symbol adının doğru olduğundan emin olun
3. Alert koşullarını gözden geçirin
4. Log'larda hata mesajlarını kontrol edin

### Debouncing çalışmıyor

1. `last_notified_at` değerini kontrol edin
2. NOTIFICATION_COOLDOWN süresini ayarlayın
3. Fiyatın aralığın dışına çıktığından emin olun

## 📚 Referanslar

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Neon Database](https://neon.tech/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## 📞 Destek

Sorunlar için GitHub Issues kullanın veya dokümantasyonu kontrol edin.


