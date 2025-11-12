# 🔧 Icon Arka Plan Düzeltme

## Sorun
Logo dosyalarında arka plan beyaz görünüyor, siyah olmalı.

## Çözüm: Online Araç Kullan

### 1. Adaptive Icon (adaptive-icon.png)

**Android Asset Studio kullan:**
1. https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html adresine git
2. **Foreground Image**: `app/icon.png` dosyasını yükle
3. **Background Color**: `#000000` (siyah) seç
4. **Resize**: Logo'yu merkeze yerleştir (768x768 safe area içinde)
5. **Download** butonuna tıkla
6. İndirilen dosyadan `ic_launcher_foreground.png` dosyasını al
7. Bu dosyayı `mobile/assets/adaptive-icon.png` olarak kaydet

**Veya basit yöntem:**
- `app/icon.png` dosyası zaten siyah arka planlı ise, direkt kopyala:
```bash
cp app/icon.png mobile/assets/adaptive-icon.png
```

### 2. Splash Screen (splash.png)

**App Icon Generator kullan:**
1. https://www.appicon.co/#app-icon adresine git
2. **Splash Screen** sekmesine git
3. **Image**: `app/icon.png` dosyasını yükle
4. **Background Color**: `#000000` (siyah) seç
5. **Size**: 1242x2436 px seç
6. **Download** butonuna tıkla
7. İndirilen dosyayı `mobile/assets/splash.png` olarak kaydet

**Veya basit yöntem:**
- `app/icon.png` dosyasını 1242x2436 boyutuna getir (ama logo merkezde olmalı):
```bash
sips -z 1242 2436 app/icon.png --out mobile/assets/splash.png
```

## Kontrol

Dosyaları oluşturduktan sonra kontrol edin:
```bash
cd mobile
file assets/adaptive-icon.png assets/splash.png
```

Arka plan siyah olmalı (#000000).

## Not

Eğer `app/icon.png` zaten siyah arka planlı ise, direkt kullanabilirsiniz. Ama adaptive-icon için logo'nun merkeze yerleştirilmesi gerekiyor (768x768 safe area).

