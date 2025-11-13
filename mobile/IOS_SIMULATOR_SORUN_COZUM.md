# iOS Simulator Sorunu - iOS 26.1 Yüklü Değil

## 🔍 Sorun
```
error: iOS 26.1 is not installed. Please download and install the platform from Xcode > Settings > Components.
```

## ✅ Çözüm 1: iOS 26.1 Runtime'ını Yükle (Önerilen)

1. **Xcode'u açın**
2. **Xcode** → **Settings** (veya `Cmd + ,`)
3. **Components** sekmesine gidin
4. **iOS 26.1 Simulator** runtime'ını bulun
5. **Download** butonuna tıklayın
6. İndirme tamamlandıktan sonra tekrar deneyin

## ✅ Çözüm 2: Xcode'dan Direkt Çalıştır

1. **Xcode'u açın:**
   ```bash
   cd /Users/ata/Desktop/alertachart/mobile/ios
   open AlertaChartTradeSync.xcworkspace
   ```

2. **Xcode'da:**
   - Üstteki cihaz seçici menüsünden **iPhone 17 Pro** seçin (zaten açık)
   - `Cmd + R` ile çalıştırın

## ✅ Çözüm 3: Expo ile Farklı Simulator Kullan

```bash
cd mobile

# Tüm mevcut simulator'ları listele
xcrun simctl list devices available

# Belirli bir simulator ile çalıştır
npx expo run:ios --simulator="iPhone 17 Pro"
```

## ✅ Çözüm 4: Simulator'ı Yeniden Başlat

```bash
# Tüm simulator'ları kapat
xcrun simctl shutdown all

# Simulator'ı aç
open -a Simulator

# iPhone 17 Pro'yu seç
xcrun simctl boot "iPhone 17 Pro"

# Tekrar deneyin
cd mobile
npm run ios
```

## 🎯 Hızlı Çözüm (Şimdi)

En hızlı çözüm Xcode'dan direkt çalıştırmak:

```bash
cd /Users/ata/Desktop/alertachart/mobile/ios
open AlertaChartTradeSync.xcworkspace
```

Sonra Xcode'da:
1. Üstteki cihaz seçici menüsünden **iPhone 17 Pro** seçin
2. `Cmd + R` ile çalıştırın

## 📝 Notlar

- **iOS 26.1 Runtime:** Xcode Settings > Components'ten yüklenebilir
- **Simulator Versiyonu:** Mevcut simulator iOS 26.0 kullanıyor
- **Xcode SDK:** iOS 26.1 SDK yüklü ama simulator runtime yok


