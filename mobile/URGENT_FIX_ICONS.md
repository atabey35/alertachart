# 🚨 ACİL: Icon ve Splash Screen Düzeltme

## Sorun
- ✅ Play Store'da logo doğru (mavi çan logosu)
- ❌ Uygulama indirildiğinde:
  - İlk açılış ekranında **yeşil daire** görünüyor
  - Ana ekranda icon **yeşil kare** görünüyor
  - Olması gereken: **Mavi çan logosu**

## Çözüm: Online Araçlar Kullan

### 1. Adaptive Icon (ÖNEMLİ - Ana Ekranda Görünen)

**Android Asset Studio:**
1. https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. **Foreground Image**: `app/icon.png` yükle (mavi çan logosu)
3. **Background Color**: `#000000` (siyah)
4. **Download** → ZIP indir
5. ZIP'i aç → `res/mipmap-xxxhdpi/ic_launcher_foreground.png` bul
6. Bu dosyayı `mobile/assets/adaptive-icon.png` olarak kaydet:
   ```bash
   cp ic_launcher_foreground.png mobile/assets/adaptive-icon.png
   # Veya 1024x1024'e resize et:
   sips -z 1024 1024 ic_launcher_foreground.png --out mobile/assets/adaptive-icon.png
   ```

### 2. Splash Screen Logo

**App Icon Generator:**
1. https://www.appicon.co/#app-icon → **Splash Screen** sekmesi
2. **Image**: `app/icon.png` yükle (mavi çan logosu)
3. **Background Color**: `#000000` (siyah)
4. **Size**: 1242x2436 px
5. **Download** → `mobile/assets/splash.png` olarak kaydet

### 3. Native Dosyaları Yeniden Oluştur

```bash
cd mobile
npx expo prebuild --clean
```

Bu komut:
- `adaptive-icon.png`'den Android native icon dosyalarını oluşturur
- `splash.png`'den splash screen dosyalarını oluşturur

### 4. Yeni Build Al

```bash
eas build --platform android --profile production
```

## Kontrol Listesi

- [ ] `mobile/assets/adaptive-icon.png` - Transparent background, logo merkezde (1024x1024)
- [ ] `mobile/assets/splash.png` - Siyah background, logo merkezde (1242x2436)
- [ ] `mobile/app.json` - `backgroundColor: "#000000"` ✅
- [ ] `npx expo prebuild --clean` çalıştırıldı
- [ ] Yeni build alındı

## Not

- `app/icon.png` dosyası mavi çan logosunu içermeli
- Adaptive icon'un foreground'u transparent background'lu olmalı
- Background color `app.json`'da `#000000` olarak ayarlı ✅

