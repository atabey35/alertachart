# 🔔 Bildirim İkonu Düzeltme

## Sorun
Bildirim panelinde görünen logo yeşil görünüyor, uygulama logosu (mavi çan) olmalı.

## Android Bildirim İkonu Kuralları

Android bildirim ikonu için özel kurallar var:
- **Sadece beyaz ve transparent** renkler kullanılmalı
- **Basit, siluet tarzı** olmalı (renkli logo çalışmaz)
- **96x96 px** boyutunda olmalı
- **Transparent background**

## Çözüm: Online Araç Kullan

### Android Asset Studio - Notification Icon Generator

1. **https://romannurik.github.io/AndroidAssetStudio/notifications.html** adresine git
2. **Foreground Image**: `app/icon.png` yükle (mavi çan logosu)
3. Araç otomatik olarak:
   - Logo'yu beyaz/siluet haline çevirir
   - Transparent background ekler
   - Tüm density'ler için oluşturur
4. **Download** → ZIP indir
5. ZIP'i aç → `res/drawable-*/notification_icon.png` dosyalarını bul
6. Bu dosyaları `mobile/android/app/src/main/res/drawable-*/` klasörlerine kopyala:
   ```bash
   # Örnek:
   cp res/drawable-mdpi/notification_icon.png mobile/android/app/src/main/res/drawable-mdpi/
   cp res/drawable-hdpi/notification_icon.png mobile/android/app/src/main/res/drawable-hdpi/
   cp res/drawable-xhdpi/notification_icon.png mobile/android/app/src/main/res/drawable-xhdpi/
   cp res/drawable-xxhdpi/notification_icon.png mobile/android/app/src/main/res/drawable-xxhdpi/
   cp res/drawable-xxxhdpi/notification_icon.png mobile/android/app/src/main/res/drawable-xxxhdpi/
   ```

## Alternatif: Manuel Oluşturma

Eğer online araç kullanmak istemiyorsanız:

1. `app/icon.png` dosyasını aç
2. Logo'yu siyah-beyaz/siluet haline çevir
3. 96x96 px'e resize et
4. Transparent background ekle
5. Tüm density'ler için oluştur:
   - mdpi: 24x24 px
   - hdpi: 36x36 px
   - xhdpi: 48x48 px
   - xxhdpi: 72x72 px
   - xxxhdpi: 96x96 px

## Sonraki Adımlar

1. Notification icon dosyalarını güncelle
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

- Bildirim ikonu **sadece beyaz** olmalı (renkli logo çalışmaz)
- Android sistem bildirimlerinde renkli icon'lar desteklenmez
- Logo'yu siluet/beyaz haline çevirmek gerekiyor

