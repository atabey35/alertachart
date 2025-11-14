# Firebase Cloud Messaging (FCM) Kurulumu

Android production build'de push notification'lar için Firebase gerekli.

## Adım 1: Firebase Console'da Proje Oluştur

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. "Add project" → Proje adı: "Alerta" (veya istediğiniz isim)
3. Google Analytics'i isteğe bağlı bırakabilirsiniz

## Adım 2: Android App Ekleyin

1. Firebase projesinde "Add app" → Android ikonu
2. **Package name**: `com.kriptokirmizi.alerta` (app.json'daki ile aynı olmalı)
3. App nickname: "Alerta Android"
4. "Register app" butonuna tıklayın

## Adım 3: google-services.json İndirin

1. `google-services.json` dosyasını indirin
2. Bu dosyayı saklayın (EAS'a yükleyeceğiz)

## Adım 4: EAS'a Credentials Ekle

Terminal'de:

```bash
cd mobile
eas credentials
```

1. Platform seçin: **Android**
2. Build profile seçin: **production**
3. "Set up FCM server key" seçeneğini seçin
4. Firebase Console'dan **Server Key**'i kopyalayın:
   - Firebase Console → Project Settings → Cloud Messaging → Server key
5. Server key'i yapıştırın

## Adım 5: Yeni Build Al

FCM credentials eklendikten sonra yeni build alın:

```bash
eas build --platform android --profile production
```

## Alternatif: google-services.json ile

Eğer `google-services.json` dosyasını indirdiyseniz:

```bash
cd mobile
eas credentials
# Android → production → Set up Google Services
# google-services.json dosyasını yükleyin
```

## Test

Build tamamlandıktan sonra:
1. Yeni APK'yı yükleyin
2. Uygulamayı açın
3. Push token alınmalı (loglarda görünecek)
4. Admin panelden test bildirimi gönderin











