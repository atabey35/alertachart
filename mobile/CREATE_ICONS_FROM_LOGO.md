# 🎨 Logo'dan Icon Dosyaları Oluşturma

## ✅ Tamamlanan
- `icon.png` → `mobile/assets/icon.png` (1024x1024) ✅

## 🔧 Yapılacaklar

### 1. Adaptive Icon Oluştur

**Online Araç Kullan (Önerilen):**
1. https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html adresine git
2. **Foreground Image**: `app/icon.png` dosyasını yükle
3. **Background Color**: `#000000` (siyah) seç
4. **Resize**: Logo'yu merkeze yerleştir (768x768 safe area içinde)
5. **Download** butonuna tıkla
6. İndirilen dosyadan `ic_launcher_foreground.png` dosyasını al
7. Bu dosyayı `mobile/assets/adaptive-icon.png` olarak kaydet

**Veya Manuel:**
- `app/icon.png` dosyasını aç
- 768x768 px'e resize et (merkezde)
- 1024x1024 px transparent canvas oluştur
- Logo'yu merkeze yerleştir
- `mobile/assets/adaptive-icon.png` olarak kaydet

### 2. Splash Screen Oluştur

**Online Araç Kullan:**
1. https://www.appicon.co/#app-icon adresine git
2. **Splash Screen** sekmesine git
3. **Image**: `app/icon.png` dosyasını yükle
4. **Background Color**: `#000000` (siyah) seç
5. **Size**: 1242x2436 px seç
6. **Download** butonuna tıkla
7. İndirilen dosyayı `mobile/assets/splash.png` olarak kaydet

**Veya Manuel:**
- 1242x2436 px siyah (#000000) canvas oluştur
- `app/icon.png` dosyasını 400x400 px'e resize et
- Logo'yu merkeze yerleştir
- `mobile/assets/splash.png` olarak kaydet

## 📋 Kontrol Listesi

- [ ] `mobile/assets/icon.png` (1024x1024) ✅
- [ ] `mobile/assets/adaptive-icon.png` (1024x1024, transparent background)
- [ ] `mobile/assets/splash.png` (1242x2436, siyah background)

## 🚀 Sonraki Adımlar

Dosyaları oluşturduktan sonra:

```bash
cd mobile

# Native dosyaları yeniden oluştur
npx expo prebuild --clean

# Yeni build al
eas build --platform android --profile production
```

## 📝 Notlar

- **Adaptive Icon**: Logo merkezde olmalı, 768x768 safe area içinde
- **Splash Screen**: Logo merkezde, siyah background
- **Background Renk**: Tüm dosyalarda #000000 (siyah) kullanılmalı

