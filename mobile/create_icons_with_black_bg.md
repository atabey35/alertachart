# 🎨 Siyah Arka Planlı Icon Oluşturma

## Hızlı Çözüm (Online Araç)

### 1. Adaptive Icon

1. **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
   - Foreground: `app/icon.png` yükle
   - Background: `#000000` (siyah)
   - Download → `ic_launcher_foreground.png` → `mobile/assets/adaptive-icon.png`

### 2. Splash Screen

1. **App Icon Generator**: https://www.appicon.co/#app-icon
   - Splash Screen sekmesi
   - Image: `app/icon.png` yükle
   - Background: `#000000` (siyah)
   - Size: 1242x2436
   - Download → `mobile/assets/splash.png`

## Alternatif: Manuel (Eğer app/icon.png siyah arka planlı ise)

```bash
cd /Users/ata/Desktop/alertachart

# Adaptive icon: app/icon.png'ü direkt kullan (1024x1024, siyah arka plan)
cp app/icon.png mobile/assets/adaptive-icon.png

# Splash screen: app/icon.png'ü 1242x2436'e resize et
sips -z 1242 2436 app/icon.png --out mobile/assets/splash.png
```

**Not**: Bu yöntem logo'yu merkeze yerleştirmez, sadece resize eder. Online araç daha iyi sonuç verir.

