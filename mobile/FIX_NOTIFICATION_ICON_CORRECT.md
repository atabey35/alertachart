# 🔔 Bildirim İkonu Düzeltme - Doğru Linkler

## Android Bildirim İkonu Oluşturma

### Yöntem 1: Android Asset Studio (Önerilen)

**Doğru Link:**
https://romannurik.github.io/AndroidAssetStudio/icons-notification.html

**Adımlar:**
1. Link'e git
2. **Foreground Image**: `app/icon.png` yükle (mavi çan logosu)
3. Araç otomatik olarak logo'yu beyaz/siluet haline çevirir
4. **Download** → ZIP indir
5. ZIP'i aç ve dosyaları kopyala (aşağıya bak)

### Yöntem 2: Manuel Oluşturma

Eğer online araç çalışmazsa, `app/icon.png`'den manuel oluşturabilirsiniz:

1. `app/icon.png` dosyasını bir görüntü editöründe aç (Photoshop, GIMP, vb.)
2. Logo'yu siyah-beyaz/siluet haline çevir
3. Sadece beyaz ve transparent renkler bırak
4. Farklı boyutlarda export et:
   - mdpi: 24x24 px
   - hdpi: 36x36 px
   - xhdpi: 48x48 px
   - xxhdpi: 72x72 px
   - xxxhdpi: 96x96 px

### Dosyaları Kopyalama

Android Asset Studio'dan indirdiğiniz ZIP'i açtıktan sonra:

```bash
cd ~/Downloads
# ZIP'i aç (dosya adı farklı olabilir)
unzip notification-icons.zip

# Dosyaları kopyala
# Not: Dosya adı ic_stat_notification.png veya notification_icon.png olabilir
cp res/drawable-mdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-mdpi/notification_icon.png
cp res/drawable-hdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-hdpi/notification_icon.png
cp res/drawable-xhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xhdpi/notification_icon.png
cp res/drawable-xxhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xxhdpi/notification_icon.png
cp res/drawable-xxxhdpi/ic_stat_notification.png mobile/android/app/src/main/res/drawable-xxxhdpi/notification_icon.png
```

**Veya** dosya adı farklıysa:
```bash
# Önce dosya adını kontrol et
ls res/drawable-xxxhdpi/

# Sonra doğru dosya adıyla kopyala
```

### Sonraki Adımlar

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

## Alternatif: Basit Çözüm

Eğer online araçlar çalışmazsa, mevcut `app/icon.png`'den basit bir notification icon oluşturabiliriz:

```bash
cd /Users/ata/Desktop/alertachart

# app/icon.png'den 96x96 beyaz logo oluştur (basit yöntem)
# Bu sadece geçici bir çözüm, ideal değil
sips -z 96 96 app/icon.png --out /tmp/notif_temp.png

# Tüm density'ler için kopyala
cp /tmp/notif_temp.png mobile/android/app/src/main/res/drawable-mdpi/notification_icon.png
cp /tmp/notif_temp.png mobile/android/app/src/main/res/drawable-hdpi/notification_icon.png
cp /tmp/notif_temp.png mobile/android/app/src/main/res/drawable-xhdpi/notification_icon.png
cp /tmp/notif_temp.png mobile/android/app/src/main/res/drawable-xxhdpi/notification_icon.png
cp /tmp/notif_temp.png mobile/android/app/src/main/res/drawable-xxxhdpi/notification_icon.png
```

**Not**: Bu yöntem logo'yu beyaz/siluet haline çevirmez, sadece resize eder. Online araç daha iyi sonuç verir.

