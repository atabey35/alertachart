# TestFlight İndirme Sorunu - Hızlı Çözüm

## 🔍 Sorun
TestFlight'tan uygulama indirilemiyor: "istenilen uygulama kullanılamıyor veya yok"

## ⚡ Hızlı Kontrol Listesi

### 1. App Store Connect Kontrolü (ÖNEMLİ!)

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **Alerta Chart** uygulamasını açın
2. **TestFlight** sekmesine gidin
3. **iOS Builds** bölümüne bakın:
   - ✅ Build var mı? (Build number 14 olmalı)
   - ✅ Build durumu ne? 
     - "Processing" → Bekleyin (10-30 dakika)
     - "Ready to Submit" → TestFlight'a ekleyin
     - "Expired" → Yeni build gerekli
     - Build yok → Submit edilmemiş!

### 2. Build Submit Edilmemişse

**Seçenek A: EAS CLI ile (Önerilen)**
```bash
cd mobile
eas submit --platform ios --latest
```
Apple ID ve şifre isteyecek.

**Seçenek B: Manuel Submit**
1. [EAS Dashboard](https://expo.dev/accounts/kriptokirmizi/projects/alerta/builds) → Son iOS build'i bulun
2. **Application Archive URL** linkinden `.ipa` dosyasını indirin
3. [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight** → **iOS Builds** → **+** butonu
4. İndirdiğiniz `.ipa` dosyasını yükleyin

### 3. Build Processing'deyse

Eğer build "Processing" durumundaysa:
- 10-30 dakika bekleyin
- App Store Connect'i yenileyin
- Build hazır olduğunda TestFlight'ta görünecek

### 4. Build Expired ise

90 gün geçmişse build expire olur. Yeni build alın:

```bash
cd mobile

# Build number'ı artır
# app.json'da "buildNumber": "15" yapın

# Yeni build al
eas build --profile production --platform ios

# Build tamamlandıktan sonra submit et
eas submit --platform ios --latest
```

### 5. TestFlight'ta Build Görünüyor Ama İndirilemiyor

**Internal Testing için:**
- Cihazınızın UDID'si App Store Connect'te kayıtlı olmalı
- TestFlight → Internal Testing → Testers → Cihazınızı ekleyin

**External Testing için:**
- Build'i external testing grubuna ekleyin
- TestFlight'ta görünmesi için biraz bekleyin

## 🎯 En Olası Sorun

**Build TestFlight'a submit edilmemiş!**

Çözüm:
```bash
cd mobile
eas submit --platform ios --latest
```

## 📱 TestFlight'ta Test

1. TestFlight uygulamasını açın
2. **Alerta Chart** uygulamasını bulun
3. **Install** butonuna tıklayın
4. Hata alırsanız:
   - Cihazı yeniden başlatın
   - TestFlight uygulamasını güncelleyin
   - App Store Connect'te build durumunu kontrol edin

## 🆘 Hala Çalışmıyorsa

1. **App Store Connect'te build loglarını kontrol edin**
   - TestFlight → iOS Builds → Build'e tıklayın → Logs

2. **EAS Dashboard'da build loglarını kontrol edin**
   - [EAS Dashboard](https://expo.dev/accounts/kriptokirmizi/projects/alerta/builds) → Build'e tıklayın → Logs

3. **Bundle identifier kontrolü**
   - App Store Connect'te: `com.kriptokirmizi.alerta` olmalı
   - Xcode project'te: `com.kriptokirmizi.alerta` olmalı

4. **Yeni build alın**
   - Build number'ı artırın
   - Yeni build alın
   - Submit edin

