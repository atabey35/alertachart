# 🔧 Icon ve Splash Screen Düzeltme Kılavuzu

## Sorun

Uygulama açılırken yeşil renk görünüyor çünkü:
- `assets/icon.png` → 1x1 pixel (placeholder)
- `assets/adaptive-icon.png` → 1x1 pixel (placeholder)
- `assets/splash.png` → 1x1 pixel (placeholder)

## Çözüm

### 1. Icon Dosyalarını Oluştur

#### Seçenek A: Online Araç Kullan (Önerilen)

1. **App Icon Generator** kullan:
   - https://appicon.co/
   - Logo dosyanızı yükleyin
   - 1024x1024 px icon oluşturun
   - İndirin

2. **Android Asset Studio** kullan:
   - https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
   - Foreground image: Logo (1024x1024, transparent background)
   - Background color: #000000 (siyah)
   - İndirin

#### Seçenek B: Manuel Oluştur

```bash
# ImageMagick ile (Mac/Linux)
brew install imagemagick

# Icon oluştur (siyah background, beyaz logo)
convert -size 1024x1024 xc:black -pointsize 500 -fill white -gravity center -annotate +0+0 'A' icon.png

# Adaptive icon oluştur (transparent background, logo merkezde)
convert -size 1024x1024 xc:transparent -pointsize 400 -fill white -gravity center -annotate +0+0 'A' adaptive-icon.png

# Splash screen oluştur (siyah background, logo merkezde)
convert -size 1242x2436 xc:black -pointsize 200 -fill white -gravity center -annotate +0+0 'Alerta' splash.png
```

### 2. Dosyaları Yerleştir

Oluşturduğunuz dosyaları şuraya koyun:
```
mobile/assets/
├── icon.png (1024x1024 px)
├── adaptive-icon.png (1024x1024 px, transparent background)
└── splash.png (1242x2436 px, siyah background)
```

### 3. Yeni Build Al

```bash
cd mobile

# EAS build başlat
eas build --platform android --profile production
```

### 4. Test Et

1. Yeni build'i Google Play'e yükleyin
2. Test cihazında uygulamayı açın
3. Splash screen'in siyah background ve logo ile göründüğünü kontrol edin
4. Ana ekranda icon'un doğru göründüğünü kontrol edin

## Önemli Notlar

- **Icon boyutları**: 1024x1024 px (icon.png, adaptive-icon.png)
- **Splash screen**: 1242x2436 px (splash.png)
- **Background renk**: #000000 (siyah) - app.json'da da aynı olmalı
- **Adaptive icon**: Transparent background, logo merkezde (768x768 safe area)

## Hızlı Test

Dosyaları ekledikten sonra:
```bash
cd mobile
npx expo prebuild --clean
```

Bu komut Android native dosyalarını yeniden oluşturur ve icon'ları günceller.

