# 🔧 Adaptive Icon Düzeltme - ACİL

## Sorun
- Play Store'da logo doğru görünüyor (mavi çan logosu) ✅
- Ama uygulama indirildiğinde:
  - İlk açılış ekranında yeşil daire görünüyor ❌
  - Ana ekranda icon yeşil kare görünüyor ❌
  - Olması gereken: Mavi çan logosu ✅

## Çözüm: Android Asset Studio Kullan

### Adımlar:

1. **Android Asset Studio'ya git:**
   https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

2. **Foreground Image yükle:**
   - `app/icon.png` dosyasını yükle
   - Bu dosya mavi çan logosunu içermeli

3. **Background Color:**
   - `#000000` (siyah) seç

4. **Resize:**
   - Logo otomatik olarak merkeze yerleştirilecek
   - 768x768 safe area içinde olacak

5. **Download:**
   - "Download" butonuna tıkla
   - ZIP dosyası indirilecek

6. **Dosyaları çıkar:**
   - İndirilen ZIP'i aç
   - `res/mipmap-anydpi-v26/ic_launcher.xml` dosyasını kontrol et
   - `res/mipmap-*/ic_launcher_foreground.png` dosyalarını bul

7. **adaptive-icon.png oluştur:**
   - `ic_launcher_foreground.png` dosyasını al (herhangi bir density'den, örn: mipmap-xxxhdpi)
   - Bu dosyayı `mobile/assets/adaptive-icon.png` olarak kaydet
   - VEYA: `ic_launcher_foreground.png` dosyasını 1024x1024'e resize et:
   ```bash
   sips -z 1024 1024 ic_launcher_foreground.png --out mobile/assets/adaptive-icon.png
   ```

## Kontrol

Dosyayı oluşturduktan sonra:
```bash
cd mobile
file assets/adaptive-icon.png
# PNG image data, 1024 x 1024 olmalı
```

## Sonraki Adımlar

1. `mobile/assets/adaptive-icon.png` dosyasını güncelle
2. Yeni build al:
   ```bash
   cd mobile
   npx expo prebuild --clean
   eas build --platform android --profile production
   ```

## Not

- `app.json`'da `backgroundColor: "#000000"` zaten doğru ✅
- Sadece `adaptive-icon.png` dosyasını düzeltmek yeterli
- Foreground image transparent background'lu olmalı
- Logo merkezde, 768x768 safe area içinde olmalı

