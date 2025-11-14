# Xcode'da iOS Simulator (Emülatör) Açma

## 🚀 Hızlı Yöntemler

### 1. Xcode'dan Açma (En Kolay)

1. **Xcode'u açın**
2. **Xcode menüsünden:**
   - `Xcode` → `Open Developer Tool` → `Simulator`
   - Veya kısayol: `Cmd + Shift + S` (bazı versiyonlarda)

3. **Veya Xcode'da proje açıkken:**
   - Üstteki cihaz seçici menüsünden simulator seçin
   - `Product` → `Destination` → İstediğiniz simulator'ı seçin

### 2. Terminal'den Açma

```bash
# Simulator'ı aç
open -a Simulator

# Belirli bir cihaz ile aç
xcrun simctl boot "iPhone 15 Pro"

# Tüm mevcut cihazları listele
xcrun simctl list devices
```

### 3. Expo/React Native ile Açma

```bash
cd mobile

# iOS simulator'da çalıştır
npm run ios

# Veya Expo ile
npx expo run:ios

# Belirli bir cihaz ile
npx expo run:ios --simulator="iPhone 15 Pro"
```

## 📱 Simulator Cihazları

### Mevcut Cihazları Görme

1. **Xcode'da:**
   - `Window` → `Devices and Simulators`
   - Veya `Cmd + Shift + 2`

2. **Terminal'de:**
   ```bash
   xcrun simctl list devices available
   ```

### Yeni Cihaz Ekleme

1. **Xcode'da:**
   - `Window` → `Devices and Simulators`
   - `+` butonuna tıklayın
   - Cihaz tipi ve iOS versiyonu seçin

2. **Terminal'de:**
   ```bash
   # Mevcut runtime'ları listele
   xcrun simctl list runtimes
   
   # Yeni cihaz oluştur
   xcrun simctl create "iPhone 15 Pro Max" "iPhone 15 Pro Max" "iOS-17-0"
   ```

## 🎯 Bu Proje İçin

### Expo/React Native Projesi

```bash
cd /Users/ata/Desktop/alertachart/mobile

# iOS simulator'da çalıştır
npm run ios

# Veya
npx expo run:ios
```

### Xcode Project'i Açma

```bash
cd /Users/ata/Desktop/alertachart/mobile/ios

# Xcode workspace'i aç
open AlertaChartTradeSync.xcworkspace

# Veya Xcode project'i aç
open AlertaChartTradeSync.xcodeproj
```

Xcode'da:
1. Üstteki cihaz seçici menüsünden simulator seçin
2. `Cmd + R` ile çalıştırın

## 🔧 Yararlı Komutlar

### Simulator'ı Kapatma
```bash
# Tüm simulator'ları kapat
xcrun simctl shutdown all

# Belirli bir simulator'ı kapat
xcrun simctl shutdown "iPhone 15 Pro"
```

### Simulator'ı Sıfırlama
```bash
# Belirli bir simulator'ı sıfırla
xcrun simctl erase "iPhone 15 Pro"

# Tüm simulator'ları sıfırla (DİKKAT!)
xcrun simctl erase all
```

### Simulator Ekran Görüntüsü
```bash
# Ekran görüntüsü al
xcrun simctl io booted screenshot screenshot.png

# Video kaydet
xcrun simctl io booted recordVideo video.mov
```

## 📝 Notlar

- **İlk açılış:** Simulator ilk açılışta biraz yavaş olabilir
- **Bellek:** Simulator RAM kullanır, gereksiz simulator'ları kapatın
- **iOS Versiyonu:** Farklı iOS versiyonları için farklı simulator'lar gerekir
- **Xcode Versiyonu:** Xcode versiyonuna göre mevcut iOS versiyonları değişir

## 🆘 Sorun Giderme

### Simulator Açılmıyorsa
```bash
# Xcode Command Line Tools kontrol et
xcode-select --print-path

# Gerekirse yeniden yükle
sudo xcode-select --reset
```

### Simulator Yavaşsa
- Gereksiz simulator'ları kapatın
- Mac'inizi yeniden başlatın
- Xcode'u güncelleyin

### Simulator Bulunamıyorsa
```bash
# Xcode'u güncelleyin
# Veya App Store'dan Xcode'u kontrol edin
```



