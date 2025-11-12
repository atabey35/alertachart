# 🔧 Splash Screen Düzeltme - Portrait (Dikey)

## Sorun
Splash screen yatay (landscape) görünüyor, dikey (portrait) olmalı.

## Çözüm: Online Araç Kullan

### App Icon Generator

1. **https://www.appicon.co/#app-icon** adresine git
2. **Splash Screen** sekmesine tıkla
3. **Image**: `app/icon.png` dosyasını yükle (mavi çan logosu)
4. **Background Color**: `#000000` (siyah)
5. **Size**: **1242x2436 px** seç (Portrait - Dikey)
6. **Download** butonuna tıkla
7. İndirilen dosyayı `mobile/assets/splash.png` olarak kaydet

## Kontrol

Dosyayı oluşturduktan sonra:
```bash
cd mobile
sips -g pixelWidth -g pixelHeight assets/splash.png
```

**Doğru boyut**: 1242 x 2436 (width x height)
- Width (1242) < Height (2436) = Portrait ✅
- Width (2436) > Height (1242) = Landscape ❌

## Sonraki Adımlar

1. `mobile/assets/splash.png` dosyasını güncelle (1242x2436)
2. Native dosyaları yeniden oluştur:
   ```bash
   cd mobile
   npx expo prebuild --clean
   ```
3. Yeni build al:
   ```bash
   eas build --platform android --profile production
   ```

## Not

- Splash screen **portrait** (dikey) olmalı çünkü uygulama portrait modda
- Logo merkeze yerleştirilmeli
- Arka plan siyah (#000000) olmalı

