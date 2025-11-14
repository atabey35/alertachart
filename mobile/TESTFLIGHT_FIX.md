# TestFlight İndirme Sorunu - Çözüm Adımları

## 🔍 Sorun
"Alerta Charts - TradeSync yüklenemedi - istenilen uygulama kullanılamıyor veya yok" hatası

## ✅ Yapılan Düzeltmeler

1. **Root app.json Bundle Identifier Düzeltildi**
   - `com.kriptokirmizi.alertachart` → `com.kriptokirmizi.alerta`
   - EAS Project ID eşleştirildi

2. **Entitlements Düzeltildi**
   - `aps-environment`: `development` → `production`

## 📋 Yapılması Gerekenler

### 1. App Store Connect Kontrolü

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **Alerta Chart - TradeSync** (veya uygulama adı)
2. **TestFlight** sekmesine gidin
3. Kontrol edin:
   - ✅ Bundle Identifier: `com.kriptokirmizi.alerta` olmalı
   - ✅ Uygulama Adı: **"Alerta Chart - TradeSync"** (tekil, çoğul değil)
   - ✅ Son build'in durumu: "Ready to Submit" veya "Processing" olmalı

### 2. Build Submit Etme

Eğer build TestFlight'a submit edilmemişse:

```bash
cd mobile
eas submit --platform ios --latest
```

**Not:** Apple ID ve şifre gerekecek. Eğer 2FA aktifse, app-specific password kullanın.

### 3. App Store Connect'te Manuel Kontrol

Eğer `eas submit` çalışmazsa:

1. [EAS Dashboard](https://expo.dev/accounts/kriptokirmizi/projects/alerta/builds) → Son iOS build'i bulun
2. **Application Archive URL**'den `.ipa` dosyasını indirin
3. [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight** → **iOS Builds**
4. **+** butonuna tıklayın ve `.ipa` dosyasını yükleyin

### 4. Uygulama Adı Kontrolü

App Store Connect'te uygulama adı **"Alerta Chart - TradeSync"** (tekil) olmalı, **"Alerta Charts"** (çoğul) değil.

Eğer farklıysa:
1. App Store Connect → **App Information**
2. **Name** alanını kontrol edin
3. Gerekirse düzeltin

### 5. Yeni Build Gerekirse

Eğer yukarıdaki adımlar sorunu çözmezse, yeni bir build alın:

```bash
cd mobile

# Build number'ı artır
# app.json'da "buildNumber": "15" yapın

# Yeni build al
eas build --profile production --platform ios

# Build tamamlandıktan sonra submit et
eas submit --platform ios --latest
```

## 🔧 Olası Sorunlar ve Çözümleri

### Sorun 1: "Bundle identifier does not match"
**Çözüm:** App Store Connect'te bundle identifier'ın `com.kriptokirmizi.alerta` olduğundan emin olun.

### Sorun 2: "App name mismatch"
**Çözüm:** App Store Connect'te uygulama adının **"Alerta Chart - TradeSync"** (tekil) olduğundan emin olun.

### Sorun 3: "Provisioning profile error"
**Çözüm:** 
```bash
cd mobile
eas credentials --platform ios
# Production profile seçin ve credentials'ları yenileyin
```

### Sorun 4: Build TestFlight'ta görünmüyor
**Çözüm:** Build'in submit edildiğinden emin olun. App Store Connect'te "Processing" durumunda olabilir (10-30 dakika sürebilir).

## 📱 TestFlight'ta Test Etme

1. TestFlight uygulamasını açın
2. **Alerta Chart - TradeSync** uygulamasını bulun
3. **Install** butonuna tıklayın
4. Eğer hala hata alıyorsanız, cihazı yeniden başlatın

## 🆘 Hala Çalışmıyorsa

1. App Store Connect'te build loglarını kontrol edin
2. EAS Dashboard'da build loglarını kontrol edin
3. TestFlight'ta build'in expire olup olmadığını kontrol edin (90 gün)
4. Yeni bir build alıp submit edin


