# EAS Credentials - Google Services Ekleme

## Adım 1: Terminal'de EAS Credentials Komutunu Çalıştır

```bash
cd mobile
eas credentials
```

## Adım 2: Seçimler

1. **Platform**: `Android` seçin
2. **Build profile**: `production` seçin
3. **What would you like to do?**: `Set up Google Services (google-services.json)` seçin

## Adım 3: Dosya Yükle

- `google-services.json` dosyası zaten `mobile/` klasöründe
- Dosya yolunu sorduğunda: `./google-services.json` yazın
- Veya dosya yolunu tam olarak verin

## Adım 4: Onay

EAS dosyayı yükleyecek ve credentials'ları kaydedecek.

## Alternatif: Manuel Yükleme

Eğer interaktif komut çalışmazsa:

```bash
cd mobile
eas credentials --platform android
# Sonra "production" profile seçin
# "Set up Google Services" seçin
# google-services.json dosyasını yükleyin
```

## Sonra

Credentials eklendikten sonra yeni build alın:

```bash
eas build --platform android --profile production
```

## Kontrol

Build tamamlandıktan sonra:
- Yeni APK'yı yükleyin
- Uygulamayı açın
- Push token alınmalı (loglarda görünecek)










