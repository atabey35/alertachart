# 🎯 Sonraki Adımlar - Mobil Uygulama Test

## ✅ Backend Hazır!

Backend başarıyla çalışıyor:
- ✅ Database bağlantısı aktif
- ✅ Push notification API çalışıyor
- ✅ Fiyat takip servisi aktif (BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT)
- ✅ Test uyarısı oluşturuldu

## 📱 Mobil Uygulamayı Başlatmak İçin

### Adım 1: Expo Hesabı Oluştur
```bash
# Tarayıcıda:
https://expo.dev/signup
# Ücretsiz hesap oluştur
```

### Adım 2: EAS CLI ile Login
```bash
cd mobile
eas login
# Email ve şifre ile giriş yap
```

### Adım 3: EAS Projesi Oluştur
```bash
eas build:configure
# Bu komut otomatik olarak projectId oluşturacak
```

### Adım 4: Project ID'yi Güncelle

**Otomatik güncelleme:**
```bash
# EAS build:configure çalıştırdıktan sonra
# app.json içindeki projectId otomatik güncellenecek
```

**Manuel güncelleme (gerekirse):**
1. `mobile/app.json` aç
2. `extra.eas.projectId` değerini kopyala
3. `mobile/src/services/notifications.ts` içinde de aynı projectId'yi kullan

### Adım 5: Uygulamayı Başlat
```bash
# Development server
npm start

# iOS (Mac gerekli)
npm run ios

# Android
npm run android

# Expo Go ile test (en kolay)
# QR kodu tarayın
```

## 🧪 Test Senaryosu

### 1. Mobil App Açılınca
- Push izni isteyecek → İzin ver
- WebView yüklenecek
- Konsolda device ID görünecek

### 2. Test Push Gönder
```bash
# Device ID'yi mobil konsoldan al, sonra:
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"MOBIL_DEVICE_ID"}'
```

### 3. Fiyat Uyarısı Oluştur
```bash
curl -X POST http://localhost:3000/api/alerts/price \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId":"MOBIL_DEVICE_ID",
    "symbol":"BTCUSDT",
    "targetPrice":106000,
    "proximityDelta":500,
    "direction":"up"
  }'
```

### 4. Gerçek Bildirim Bekle
BTC fiyatı 105,500 - 106,000 USD arasına geldiğinde telefona bildirim düşecek!

## 🔧 Development URL'leri Güncelleme

Mobil cihazdan local backend'e bağlanmak için:

### Mac'inizin IP Adresini Öğrenin
```bash
# Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Örnek çıktı: 192.168.1.100
```

### URL'leri Güncelleyin

**1. `mobile/src/services/api.ts`:**
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:3000/api'  // SİZİN IP'NİZ
  : 'https://alerta.kriptokirmizi.com/api';
```

**2. `mobile/src/components/AppWebView.tsx`:**
```typescript
const WEBVIEW_URL = __DEV__
  ? 'http://192.168.1.100:3000'  // SİZİN IP'NİZ
  : 'https://alerta.kriptokirmizi.com';
```

## 📱 Expo Go ile Hızlı Test (Önerilen)

### 1. Expo Go İndir
- iOS: App Store → "Expo Go"
- Android: Play Store → "Expo Go"

### 2. Aynı WiFi'ye Bağlan
- Bilgisayar ve telefon aynı ağda olmalı

### 3. Mobil Uygulamayı Başlat
```bash
cd mobile
npm start
```

### 4. QR Kodu Tara
- iOS: Camera app ile QR kodu tara
- Android: Expo Go içinden QR kodu tara

## ⚠️ Önemli Notlar

### Firewall
Mac'te firewall aktifse, Next.js'e izin verin:
```
System Preferences → Security & Privacy → Firewall → Firewall Options
→ "Node" veya "Next" için izin ver
```

### CORS (Gerekirse)
Backend'de CORS ayarı gerekebilir. Zaten yapılandırılmış ama sorun olursa:
```typescript
// next.config.js
async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
      ],
    },
  ];
}
```

## 🎉 Başarı Kriterleri

Mobil app doğru çalışıyorsa:
- [ ] WebView yüklendi ve site görünüyor
- [ ] Push izni verildi
- [ ] Device ID konsolda görünüyor
- [ ] Test push bildirimi geldi
- [ ] Fiyat uyarısı oluşturuldu
- [ ] Backend console'da loglar görünüyor

## 🆘 Sorun Giderme

### "Cannot connect to Metro bundler"
```bash
# Port 8081 meşgul olabilir
lsof -i :8081
# Process'i kill edin
```

### "Network request failed"
- IP adresini kontrol edin
- Aynı WiFi'de olduğunuzdan emin olun
- Firewall ayarlarını kontrol edin

### Push notification gelmiyor
- İzin verildi mi kontrol edin
- Device ID doğru mu kontrol edin
- Backend console'da hata var mı bakın

## 📚 Sonraki Adımlar

1. ✅ Backend çalışıyor
2. 🔄 Mobil app kurulumu (şimdi)
3. 🧪 Test push notification
4. 🎯 Fiyat uyarısı testi
5. 🚀 Production deployment
6. 🏪 App Store / Play Store yayınlama

---

**Şu an:** Backend tamamen hazır ve çalışıyor!
**Sırada:** Mobil uygulama setup ve test

Hazırsanız `cd mobile && npm start` ile başlayalım! 🚀
