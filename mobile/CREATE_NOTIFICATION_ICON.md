# 🔔 Bildirim İkonu Oluşturma

## Sorun
Bildirim panelinde görünen logo yeşil görünüyor, uygulama logosu (mavi çan) olmalı.

## Android Bildirim İkonu Kuralları

⚠️ **ÖNEMLİ**: Android bildirim ikonu için özel kurallar var:
- ✅ **Sadece beyaz ve transparent** renkler
- ✅ **Basit, siluet tarzı** (renkli logo çalışmaz)
- ✅ **96x96 px** (xxxhdpi için)
- ✅ **Transparent background**

## Çözüm: Android Asset Studio

### Adımlar:

1. **Notification Icon Generator'a git:**
   https://romannurik.github.io/AndroidAssetStudio/notifications.html

2. **Foreground Image yükle:**
   - `app/icon.png` dosyasını yükle (mavi çan logosu)
   - Araç otomatik olarak logo'yu beyaz/siluet haline çevirir

3. **Download:**
   - "Download" butonuna tıkla
   - ZIP dosyası indirilecek

4. **Dosyaları çıkar ve kopyala:**
   ```bash
   cd ~/Downloads
   unzip notification-icons.zip  # veya indirdiğiniz ZIP dosyasının adı
   
   # Dosyaları mobile/android/app/src/main/res/ klasörlerine kopyala
   cp res/drawable-mdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-mdpi/notification_icon.png
   cp res/drawable-hdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-hdpi/notification_icon.png
   cp res/drawable-xhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xhdpi/notification_icon.png
   cp res/drawable-xxhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xxhdpi/notification_icon.png
   cp res/drawable-xxxhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xxxhdpi/notification_icon.png
   ```

   **Not**: Dosya adı `ic_stat_notification.png` olabilir, kontrol edin.

## Alternatif: app.json'dan Otomatik Oluşturma

`app.json`'da `expo-notifications` plugin'i var:
```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#ffffff"
    }
  ]
]
```

Bu ayar ile `npx expo prebuild --clean` çalıştırıldığında otomatik oluşturulur, ama logo'yu beyaz/siluet haline çevirmesi gerekiyor.

## Sonraki Adımlar

1. Notification icon dosyalarını güncelle (yukarıdaki adımları takip et)
2. Native dosyaları yeniden oluştur:
   ```bash
   cd mobile
   npx expo prebuild --clean
   ```
3. Yeni build al:
   ```bash
   eas build --platform android --profile production
   ```

## Kontrol

Dosyaları kopyaladıktan sonra:
```bash
cd mobile/android/app/src/main/res
file drawable-*/notification_icon.png
```

Tüm dosyalar PNG ve doğru boyutlarda olmalı.

