# Xcode'da Uygulamayı Test Etme

## 🚀 Hızlı Test (Simulator'da)

### 1. Simulator Seçimi
1. Xcode'da üstteki **cihaz seçici menüsüne** tıklayın
2. **iPhone 17 Pro** veya başka bir simulator seçin
3. Veya: `Product` → `Destination` → Simulator seçin

### 2. Uygulamayı Çalıştırma
- **Kısayol:** `Cmd + R` (Run)
- **Veya:** `Product` → `Run`
- **Veya:** Üstteki ▶️ (Play) butonuna tıklayın

### 3. Simulator Otomatik Açılır
- Simulator otomatik olarak açılır
- Uygulama build edilir ve simulator'da çalışır
- Konsolda loglar görünür

## 📱 Fiziksel Cihazda Test

### 1. Cihazı Bağlama
1. iPhone'unuzu USB ile Mac'e bağlayın
2. iPhone'da **"Bu bilgisayara güven"** onayını verin
3. Xcode'da cihaz seçici menüsünden iPhone'unuzu seçin

### 2. Developer Mode Aktif Etme (iOS 16+)
1. iPhone'da: `Settings` → `Privacy & Security` → `Developer Mode`
2. Developer Mode'u **Açın**
3. iPhone'u yeniden başlatın

### 3. Code Signing
1. Xcode'da `Signing & Capabilities` sekmesine gidin
2. **Team** seçin (Apple Developer hesabınız)
3. **Automatically manage signing** işaretli olsun
4. Xcode otomatik olarak provisioning profile oluşturur

### 4. Çalıştırma
- `Cmd + R` ile çalıştırın
- İlk kez çalıştırırken iPhone'da **"Untrusted Developer"** uyarısı çıkabilir
- `Settings` → `General` → `VPN & Device Management` → Developer App'e güvenin

## 🔍 Debug ve Log Kontrolü

### 1. Console Logları
1. Xcode'da alt kısımda **Debug Area** açık olmalı
2. Açık değilse: `View` → `Debug Area` → `Show Debug Area` (`Cmd + Shift + Y`)
3. Console'da uygulama loglarını görebilirsiniz

### 2. Breakpoint Koyma
1. Kod satırının solundaki **gri alana** tıklayın
2. Mavi breakpoint noktası oluşur
3. Uygulama çalışırken o satıra geldiğinde durur
4. Değişken değerlerini inceleyebilirsiniz

### 3. Network Logları
1. `Debug` → `Simulate Background Fetch`
2. Network isteklerini görmek için:
   - Safari → `Develop` → Simulator → `localhost` → Network tab

## 🐛 Hata Kontrolü

### 1. Build Hataları
- Xcode'da **Issue Navigator** (`Cmd + 4`) açın
- Kırmızı hatalar ve sarı uyarılar görünür
- Hatalara tıklayarak detayları görebilirsiniz

### 2. Runtime Hataları
- Console'da kırmızı hata mesajları görünür
- Stack trace'i inceleyerek hatanın kaynağını bulabilirsiniz

### 3. Crash Logları
- `Window` → `Devices and Simulators` (`Cmd + Shift + 2`)
- Cihazınızı seçin → `View Device Logs`
- Crash loglarını görebilirsiniz

## ✅ Test Checklist

### Uygulama Açılıyor mu?
- [ ] Build başarılı mı? (Konsolda "Build Succeeded")
- [ ] Simulator/Cihaz açıldı mı?
- [ ] Uygulama otomatik olarak başladı mı?
- [ ] Splash screen görünüyor mu?
- [ ] Ana ekran yüklendi mi?

### Uygulama Çalışıyor mu?
- [ ] Crash olmuyor mu?
- [ ] Network istekleri çalışıyor mu?
- [ ] UI elementleri görünüyor mu?
- [ ] Butonlar çalışıyor mu?
- [ ] Navigation çalışıyor mu?

### Loglar
- [ ] Console'da hata var mı?
- [ ] Network istekleri başarılı mı?
- [ ] API yanıtları geliyor mu?

## 🎯 Bu Proje İçin Özel Testler

### 1. WebView Yükleniyor mu?
- Console'da WebView URL'ini kontrol edin
- Network isteklerini kontrol edin

### 2. Push Notifications
- Push token alınıyor mu?
- Console'da token logunu kontrol edin

### 3. Backend Bağlantısı
- API istekleri başarılı mı?
- Console'da network hataları var mı?

## 🛠️ Yararlı Komutlar

### Simulator'ı Reset Etme
```bash
# Simulator'ı sıfırla
xcrun simctl erase "iPhone 17 Pro"
```

### Logları Temizleme
- Xcode'da: `Product` → `Clean Build Folder` (`Cmd + Shift + K`)

### Derived Data Temizleme
```bash
# Xcode derived data'yı temizle
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## 📝 Notlar

- **İlk Build:** İlk build biraz uzun sürebilir (5-10 dakika)
- **Sonraki Build'ler:** Daha hızlı olur (1-2 dakika)
- **Simulator:** Simulator fiziksel cihazdan daha hızlıdır
- **Fiziksel Cihaz:** Gerçek performansı görmek için fiziksel cihaz kullanın



