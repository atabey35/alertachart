# 🚀 Quick Start Guide

En hızlı şekilde başlamak için takip edin.

## ⚡ 5 Dakikada Backend + Web

```bash
# 1. Neon Database oluştur
# https://console.neon.tech → Create Project → Connection string'i kopyala

# 2. Environment variables
cat > .env.local << EOF
DATABASE_URL=your_neon_connection_string_here
EOF

# 3. Bağımlılıkları yükle ve başlat
npm install
npm run dev

# 4. Tarayıcıda aç
open http://localhost:3000
```

✅ Web uygulaması çalışıyor!

---

## 📱 10 Dakikada Mobil App

```bash
# 1. Expo CLI kur (global)
npm install -g expo-cli eas-cli

# 2. Mobile klasörüne git
cd mobile

# 3. Bağımlılıkları yükle
npm install

# 4. Başlat
npm start

# 5. Telefonunuzda Expo Go uygulamasını açın
# QR kodu tarayın

# İLK SEFERINDE:
# - Expo hesabı oluşturun (ücretsiz)
# - eas login yapın
# - app.json'da projectId güncelleyin (eas build:configure)
```

✅ Mobil uygulama çalışıyor!

---

## 🔔 5 Dakikada Push Notifications

```bash
# 1. Backend çalıştığından emin olun
npm run dev

# 2. Fiyat servisi başlat
curl -X POST http://localhost:3000/api/push/service/start

# 3. Mobil uygulamayı açın
# İzin verin ve device ID'yi konsole bakarak alın

# 4. Test push gönder
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "YOUR_DEVICE_ID"}'
```

✅ Push notification çalışıyor!

---

## 🎯 İlk Fiyat Uyarısı

```bash
# 1. Uyarı oluştur
curl -X POST http://localhost:3000/api/alerts/price \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "YOUR_DEVICE_ID",
    "symbol": "BTCUSDT",
    "targetPrice": 106000,
    "proximityDelta": 500,
    "direction": "up"
  }'

# 2. Fiyat 105,500$ - 106,000$ arasına geldiğinde
# telefona bildirim gelecek! 🎉
```

✅ Fiyat uyarısı hazır!

---

## 📖 Detaylı Dokümantasyon

- [Tam Kurulum Rehberi](SETUP_GUIDE.md)
- [Mobil Uygulama](mobile/README.md)
- [Push Notification Sistemi](PUSH_NOTIFICATIONS.md)

---

## 🆘 Sorun mu yaşıyorsunuz?

### Backend başlamıyor
```bash
# Port meşgul mü?
lsof -i :3000
kill -9 <PID>

# node_modules temizle
rm -rf node_modules package-lock.json
npm install
```

### Mobile app açılmıyor
```bash
# Cache temizle
expo start -c

# Yeniden yükle
cd mobile
rm -rf node_modules
npm install
```

### Push gelmiyor
- Mobil cihazda izin verildi mi?
- Backend çalışıyor mu?
- Device ID doğru mu?
- Test push çalışıyor mu?

---

## 🎉 Tamamlandı!

Artık kullanmaya hazırsınız:

- ✅ Web uygulaması
- ✅ Mobil uygulama
- ✅ Push notifications
- ✅ Fiyat uyarıları
- ✅ Alarm sistemi

Keyifli kullanımlar! 🚀


