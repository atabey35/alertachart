# Mobile App Assets

Bu klasörde mobil uygulama için gerekli asset'ler bulunmalıdır.

## Gerekli Dosyalar

### İkon ve Splash Screen

- `icon.png` - Uygulama ikonu (1024x1024 px)
- `splash.png` - Splash screen (1242x2436 px için optimize, tüm cihazlarda çalışır)
- `adaptive-icon.png` - Android adaptive icon (1024x1024 px, transparent background)
- `favicon.png` - Web favicon (48x48 px)

### Bildirim İkonu (Android)

- `notification-icon.png` - Bildirim ikonu (96x96 px, transparent background, white color)
- `notification.wav` - Bildirim sesi (opsiyonel)

## Asset Oluşturma

### Online Araçlar

- [App Icon Generator](https://appicon.co/)
- [Splash Screen Generator](https://www.appicon.co/#app-icon)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

### Expo'nun Varsayılan Asset'leri

Eğer özel asset'leriniz yoksa, Expo otomatik placeholder'lar oluşturur. Production için kendi asset'lerinizi kullanmanız önerilir.

### Tasarım Kuralları

**Icon (icon.png)**:
- Boyut: 1024x1024 px
- Format: PNG
- Background: Şeffaf veya solid
- Safe area: Merkezde 512x512 px

**Splash Screen (splash.png)**:
- Boyut: 1242x2436 px (iPhone 13 Pro Max)
- Format: PNG
- Background: Solid color (app.json'da `backgroundColor` ile eşleşmeli)
- Logo: Merkezde, güvenli alan içinde

**Adaptive Icon (adaptive-icon.png)**:
- Boyut: 1024x1024 px
- Format: PNG
- Background: Şeffaf
- Foreground: Merkezde 768x768 px içinde (kenarlardan 128px margin)

**Notification Icon (notification-icon.png)**:
- Boyut: 96x96 px
- Format: PNG
- Color: Sadece beyaz ve şeffaf
- Style: Basit, siluet tarzı

## Hızlı Başlangıç (Placeholder Assets)

Eğer asset'leriniz hazır değilse, geçici olarak aşağıdaki komutları kullanarak basit placeholder'lar oluşturabilirsiniz:

```bash
# ImageMagick ile (Mac/Linux)
brew install imagemagick

# Icon oluştur (siyah background, beyaz A harfi)
convert -size 1024x1024 xc:black -pointsize 500 -fill white -gravity center -annotate +0+0 'A' icon.png

# Splash oluştur
convert -size 1242x2436 xc:black -pointsize 200 -fill white -gravity center -annotate +0+0 'Alerta' splash.png

# Adaptive icon oluştur
convert -size 1024x1024 xc:transparent -pointsize 400 -fill white -gravity center -annotate +0+0 'A' adaptive-icon.png

# Notification icon oluştur
convert -size 96x96 xc:transparent -pointsize 60 -fill white -gravity center -annotate +0+0 '🔔' notification-icon.png

# Favicon oluştur
convert icon.png -resize 48x48 favicon.png
```

## Test

Asset'leri ekledikten sonra test edin:

```bash
# Development
npm start

# Asset'ler görünmüyorsa cache'i temizleyin
expo start -c
```

## Production Checklist

- [ ] Tüm asset'ler yüklendi
- [ ] Icon boyutları doğru
- [ ] Splash screen tüm cihazlarda düzgün görünüyor
- [ ] Android adaptive icon test edildi
- [ ] Bildirim ikonu test edildi (Android)
- [ ] Asset'ler optimize edildi (boyut)


