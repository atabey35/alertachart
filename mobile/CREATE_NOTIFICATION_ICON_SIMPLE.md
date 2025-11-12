# 🔔 Bildirim İkonu Oluşturma - Basit Yöntem

## Sorun
Bildirim panelinde görünen logo yeşil, uygulama logosu (mavi çan) olmalı.

## Çözüm 1: Android Asset Studio (Ana Sayfa)

1. **Ana sayfaya git:**
   https://romannurik.github.io/AndroidAssetStudio/

2. **Notification Icons** seçeneğini bul ve tıkla
   - Veya direkt: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html

3. **Foreground Image**: `app/icon.png` yükle
4. **Download** → ZIP indir
5. Dosyaları kopyala (aşağıdaki komutları kullan)

## Çözüm 2: Manuel - app/icon.png'den Oluştur

Eğer online araç çalışmazsa, basit bir yöntem:

```bash
cd /Users/ata/Desktop/alertachart

# app/icon.png'den notification icon oluştur
# Not: Bu sadece resize eder, beyaz/siluet haline çevirmez
# Ama en azından logo görünür

# Farklı density'ler için boyutlar:
# mdpi: 24x24, hdpi: 36x36, xhdpi: 48x48, xxhdpi: 72x72, xxxhdpi: 96x96

# xxxhdpi (96x96) - en yüksek kalite
sips -z 96 96 app/icon.png --out /tmp/notif_96.png

# Tüm density'ler için kopyala (basit yöntem - aynı dosyayı kullan)
cp /tmp/notif_96.png mobile/android/app/src/main/res/drawable-mdpi/notification_icon.png
cp /tmp/notif_96.png mobile/android/app/src/main/res/drawable-hdpi/notification_icon.png
cp /tmp/notif_96.png mobile/android/app/src/main/res/drawable-xhdpi/notification_icon.png
cp /tmp/notif_96.png mobile/android/app/src/main/res/drawable-xxhdpi/notification_icon.png
cp /tmp/notif_96.png mobile/android/app/src/main/res/drawable-xxxhdpi/notification_icon.png

# Doğru boyutlara resize et
sips -z 24 24 /tmp/notif_96.png --out mobile/android/app/src/main/res/drawable-mdpi/notification_icon.png
sips -z 36 36 /tmp/notif_96.png --out mobile/android/app/src/main/res/drawable-hdpi/notification_icon.png
sips -z 48 48 /tmp/notif_96.png --out mobile/android/app/src/main/res/drawable-xhdpi/notification_icon.png
sips -z 72 72 /tmp/notif_96.png --out mobile/android/app/src/main/res/drawable-xxhdpi/notification_icon.png
# xxxhdpi zaten 96x96
```

## Çözüm 3: Expo Otomatik Oluşturma

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

Bu ayar ile `npx expo prebuild --clean` çalıştırıldığında otomatik oluşturulur.

**Ancak**: Logo'yu beyaz/siluet haline çevirmez, sadece resize eder. Bu yüzden renkli logo görünebilir (ama en azından logo görünür).

## Sonraki Adımlar

1. Notification icon dosyalarını güncelle (yukarıdaki yöntemlerden birini kullan)
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

- **İdeal**: Online araç kullanarak beyaz/siluet logo oluştur
- **Hızlı çözüm**: app/icon.png'den direkt kopyala (renkli ama en azından logo görünür)
- Android bildirim ikonu için **sadece beyaz** olmalı, ama renkli logo da çalışır (sadece ideal değil)

