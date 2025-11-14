# Build 19 İndirme Sorunu - Acil Çözüm

## ⚡ Hemen Yapılacaklar

### 1. App Store Connect Kontrolü (ÖNEMLİ!)

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **Alerta Chart**
2. **TestFlight** sekmesi → **iOS Builds**
3. Build 1.2.1 (19)'u bulun
4. **Kontrol edin:**
   - Build durumu ne? (Processing/Ready/Invalid?)
   - Build'in yanında **"+"** butonu var mı? (Gruba eklenmemiş demektir)

### 2. Build Submit Edilmiş mi?

Build 19 EAS'ta başarılı ama App Store Connect'te görünmüyor olabilir.

**Submit edin:**
```bash
cd mobile
eas submit --platform ios --latest
```

### 3. Build TestFlight Grubuna Ekleyin

1. App Store Connect → **TestFlight** → **iOS Builds**
2. Build 1.2.1 (19)'u bulun
3. **"+"** veya **"Add to TestFlight"** butonuna tıklayın
4. **Internal Testing** veya **External Testing** grubunu seçin
5. Build'i gruba ekleyin

### 4. Internal Testing - Cihaz UDID

**Eğer Internal Testing kullanıyorsanız:**
1. Cihaz UDID'sini bulun:
   - iPhone: Settings → General → About → Identifier (UDID)
2. App Store Connect → **Users and Access** → **TestFlight** → **Internal Testing** → **Testers**
3. **+** butonuna tıklayın ve cihaz UDID'sini ekleyin

### 5. TestFlight Uygulamasını Yeniden Başlatın

1. TestFlight uygulamasını tamamen kapatın
2. iPhone/iPad'i yeniden başlatın
3. TestFlight'u tekrar açın
4. Uygulamayı tekrar deneyin

## 🎯 En Olası Sorun

**Build TestFlight grubuna eklenmemiş!**

Çözüm:
1. App Store Connect → **TestFlight** → **iOS Builds**
2. Build 1.2.1 (19)'u bulun
3. **"+"** butonuna tıklayın
4. Gruba ekleyin

## 🚀 Hala Çalışmıyorsa

Yeni build alın (build 20):

```bash
cd mobile

# Build number'ı 20 yap
# app.json'da "buildNumber": "20"
# Info.plist'te CFBundleVersion: 20
# Xcode project'te CURRENT_PROJECT_VERSION: 20

# Yeni build al
eas build --profile production --platform ios

# Submit et
eas submit --platform ios --latest
```



