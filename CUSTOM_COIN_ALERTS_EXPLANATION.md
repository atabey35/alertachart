# Custom Coin Alerts - Çalışma Mantığı

## 📋 Genel Bakış

Premium kullanıcılar Settings sayfasından kendi özel coin alert'lerini oluşturabilir. Sistem, kullanıcının belirlediği coin'leri izler ve fiyat hedefe yaklaştığında bildirim gönderir.

---

## 🔄 Çalışma Akışı

### 1. Alert Oluşturma (Frontend)

```
Kullanıcı → Settings → "Add Alert" → Form Doldur → Backend'e POST
```

**Form Alanları:**
- **Symbol**: Coin sembolü (örn: XRPUSDT, BTCUSDT)
- **Target Price**: Hedef fiyat (örn: 2.25$)
- **Proximity Delta**: Yaklaşma aralığı (örn: 0.1$)
- **Direction**: Yön (up/down)

**Örnek:**
```
Symbol: XRPUSDT
Target Price: 2.25$
Proximity Delta: 0.1$
Direction: up
```

**Anlamı:** XRP fiyatı 2.15$ - 2.25$ aralığına geldiğinde bildirim gönderilir.

---

### 2. Backend İşleme

#### 2.1. Alert Kaydı
```javascript
POST /api/alerts/price
→ Premium kontrolü
→ Device ID kontrolü
→ Database'e kayıt (price_alerts tablosu)
```

#### 2.2. Device Kaydı (Web Kullanıcılar İçin)
Eğer device `devices` tablosunda yoksa:
- Otomatik olarak placeholder token ile device kaydı oluşturulur
- Platform: `web` (web kullanıcılar için)

---

### 3. Alert Servisi (Backend)

#### 3.1. Alert Yükleme
```javascript
loadCustomAlerts() // Her 30 saniyede bir çalışır
→ Database'den aktif alert'leri çek
→ Symbol bazında grupla
→ Cache'e kaydet (customAlertsCache)
```

#### 3.2. WebSocket Bağlantıları
```javascript
Her unique symbol için:
→ Binance WebSocket bağlantısı kur
→ wss://stream.binance.com:9443/ws/{symbol}@ticker
→ Real-time fiyat güncellemeleri al
```

**Örnek:**
- Kullanıcı XRPUSDT alert'i oluşturdu
- Sistem XRPUSDT için WebSocket bağlantısı kurar
- Her fiyat güncellemesinde `checkCustomAlerts()` çağrılır

---

### 4. Fiyat Kontrolü

#### 4.1. Her Fiyat Güncellemesinde
```javascript
WebSocket mesajı geldi → checkCustomAlerts(symbol, currentPrice)
```

#### 4.2. Kontrol Adımları

**Adım 1: In-Memory Trigger Kontrolü**
```javascript
triggeredCustomAlerts Map'inde kontrol
→ Eğer 5 dakika içinde trigger edilmişse → SKIP
```

**Adım 2: Database Cooldown Kontrolü**
```javascript
last_notified_at kontrolü
→ Eğer 5 dakika içinde bildirim gönderilmişse → SKIP
```

**Adım 3: Yaklaşma Kontrolü**

**Direction: "up" (Yukarı)**
```
Hedef: 2.25$, Delta: 0.1$
Aralık: 2.15$ - 2.25$

Fiyat 2.15$'a düşerse → ✅ Bildirim
Fiyat 2.20$'a düşerse → ✅ Bildirim
Fiyat 2.25$'a ulaşırsa → ✅ Bildirim
Fiyat 2.10$'a düşerse → ❌ Çok uzak
```

**Direction: "down" (Aşağı)**
```
Hedef: 2.25$, Delta: 0.1$
Aralık: 2.25$ - 2.35$

Fiyat 2.35$'a çıkarsa → ✅ Bildirim
Fiyat 2.30$'a çıkarsa → ✅ Bildirim
Fiyat 2.25$'a düşerse → ✅ Bildirim
Fiyat 2.40$'a çıkarsa → ❌ Çok uzak
```

**Adım 4: Spam Önleme**
```javascript
last_price kontrolü
→ Eğer önceki fiyat da aynı aralıktaysa → SKIP
→ (Aynı seviyede takılıp kalmışsa tekrar bildirim gönderme)
```

---

### 5. Bildirim Gönderme

#### 5.1. Trigger İşaretleme
```javascript
// ÖNCE işaretle (race condition önleme)
triggeredCustomAlerts.set(triggerKey, Date.now())
```

#### 5.2. Bildirim Gönder
```javascript
sendPriceAlertNotification(
  [expo_push_token],
  symbol,
  currentPrice,
  target_price,
  direction
)
```

#### 5.3. Database Güncelleme
```javascript
updatePriceAlertNotification(id, currentPrice)
→ last_notified_at = NOW()
→ last_price = currentPrice
```

#### 5.4. Hata Durumu
```javascript
Eğer bildirim başarısız olursa:
→ triggeredCustomAlerts.delete(triggerKey)
→ Bir sonraki kontrol'de tekrar denenecek
```

---

## 🛡️ Spam Önleme Mekanizmaları

### 1. In-Memory Trigger Tracking
- Her alert için `triggeredCustomAlerts` Map'inde timestamp tutulur
- 5 dakika cooldown
- Race condition'ları önler

### 2. Database Cooldown
- `last_notified_at` kontrolü
- 5 dakika cooldown
- Server restart sonrası da çalışır

### 3. Fiyat Kontrolü
- `last_price` kontrolü
- Aynı seviyede takılıp kalmışsa tekrar bildirim göndermez

---

## 📊 Örnek Senaryo

### Senaryo: XRPUSDT Alert

**Alert Ayarları:**
- Symbol: XRPUSDT
- Target Price: 2.25$
- Proximity Delta: 0.1$
- Direction: up

**Fiyat Hareketi:**
```
2.30$ → 2.20$ → 2.15$ → 2.10$ → 2.12$ → 2.18$
```

**Bildirim Zamanları:**
- ✅ 2.15$: Bildirim gönderilir (2.25$ - 0.1$ = 2.15$)
- ❌ 2.20$: Bildirim gönderilmez (cooldown: 5 dakika)
- ❌ 2.10$: Bildirim gönderilmez (çok uzak)
- ❌ 2.12$: Bildirim gönderilmez (çok uzak)
- ❌ 2.18$: Bildirim gönderilmez (cooldown: 5 dakika)

**5 Dakika Sonra:**
- ✅ 2.16$: Bildirim gönderilir (cooldown bitti)

---

## 🔧 Teknik Detaylar

### WebSocket Bağlantıları
- Her unique symbol için ayrı WebSocket bağlantısı
- Binance Stream API kullanılıyor
- Otomatik reconnect mekanizması var

### Cache Yönetimi
- `customAlertsCache`: Symbol → Alerts[] mapping
- Her 30 saniyede bir yeniden yüklenir
- Yeni alert'ler otomatik olarak algılanır

### Database Yapısı
```sql
price_alerts:
- id
- device_id (FK → devices)
- user_id (FK → users)
- symbol
- target_price
- proximity_delta
- direction (up/down)
- is_active
- last_notified_at
- last_price
```

---

## 🚀 Performans

### Ölçeklenebilirlik
- **50 coin**: ~50 WebSocket bağlantısı (kabul edilebilir)
- **100+ coin**: Stream API önerilir (tek bağlantıda birden fazla symbol)
- **200+ coin**: Stream API + Advanced caching gerekli

### Optimizasyonlar
- In-memory trigger tracking (hızlı kontrol)
- Database index'leri (hızlı sorgu)
- Cache mekanizması (30 saniye)
- Cooldown mekanizması (spam önleme)

---

## 📱 Kullanıcı Deneyimi

1. **Alert Oluşturma**: Settings → Add Alert → Form Doldur
2. **Alert Listeleme**: Settings → Custom Coin Alerts bölümünde görünür
3. **Alert Silme**: Her alert'in yanında silme butonu
4. **Bildirim**: Fiyat hedefe yaklaştığında push notification

---

## 🔍 Debug ve Log'lar

**Backend Log'ları:**
```
📊 Loaded 1 custom alert(s) for 1 symbol(s)
🔔 Connecting to custom alert symbol: XRPUSDT (1 alert(s))
✅ Custom alert triggered: XRPUSDT @ 2.25 (up) for user 121
```

**Frontend Log'ları:**
```
[Settings] ✅ Got device ID from Capacitor: [DEVICE_ID]
[Settings] Sending request to: /api/alerts/price
[Settings] Alert created successfully
```

---

## ⚠️ Önemli Notlar

1. **Premium Kontrolü**: Sadece premium/trial kullanıcılar alert oluşturabilir
2. **Device ID**: Native app'lerde Capacitor Device plugin'inden alınır
3. **Cooldown**: Aynı alert için 5 dakika cooldown var
4. **WebSocket**: Her symbol için ayrı bağlantı (performans için Stream API önerilir)

