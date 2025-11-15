# Xcode Target Membership Düzeltme - WebViewController.swift

## 🔴 Sorun

`WebViewController.swift` dosyası Xcode projesinde görünüyor ancak "Target Membership: App" işaretli değil. Bu durumda dosya derlenmez ve plugin çalışmaz.

## ✅ Çözüm - Adım Adım

### Yöntem 1: Xcode'da Manuel Düzeltme (Önerilen)

1. **Xcode'u aç:**
   ```bash
   npx cap open ios
   ```

2. **Dosyayı bul:**
   - Sol panelde `App/App` klasörüne git
   - `WebViewController.swift` dosyasını bul

3. **Target Membership'i kontrol et:**
   - `WebViewController.swift` dosyasına tıkla
   - Sağ panelde "File Inspector" sekmesine git (sol üstteki dosya ikonu)
   - "Target Membership" bölümünü bul
   - **"App" checkbox'ını işaretle** ✅

4. **Clean ve Build:**
   ```
   Product → Clean Build Folder (⇧⌘K)
   Product → Build (⌘B)
   ```

### Yöntem 2: Dosyayı Yeniden Ekleme

Eğer Yöntem 1 işe yaramazsa:

1. **Mevcut referansı kaldır:**
   - Xcode'da `WebViewController.swift` dosyasına sağ tıkla
   - "Delete" seç
   - "Remove Reference" seç (dosyayı silme, sadece referansı kaldır)

2. **Dosyayı yeniden ekle:**
   - File → Add Files to "App"...
   - `ios/App/App/WebViewController.swift` dosyasını seç
   - **"Add to targets: App" checkbox'ını işaretle** ✅
   - "Copy items if needed" işaretli OLMASIN
   - Add'e tıkla

3. **Clean ve Build:**
   ```
   Product → Clean Build Folder (⇧⌘K)
   Product → Build (⌘B)
   ```

## 🔍 Kontrol

Dosya doğru şekilde eklendiyse:

1. **Xcode'da görünmeli:**
   - Sol panelde `App/App/WebViewController.swift` görünüyor olmalı

2. **Target Membership doğru olmalı:**
   - Dosyaya tıkla
   - Sağ panelde "Target Membership" → "App" işaretli olmalı

3. **Build sırasında derlenmeli:**
   - Build log'larında `WebViewController.swift` derleniyor olmalı
   - Hata olmamalı

## ⚠️ Önemli Notlar

- Dosya fiziksel olarak `ios/App/App/WebViewController.swift` konumunda olmalı
- Xcode proje dosyasında (`project.pbxproj`) referans olmalı
- Target Membership'te "App" işaretli olmalı
- Clean Build Folder yapmak önemli (eski build cache'i temizler)

## 🧪 Test

Düzeltme sonrası:

1. **Build:**
   ```
   Product → Build (⌘B)
   ```

2. **Run:**
   ```
   Product → Run (⌘R)
   ```

3. **Log'ları kontrol et:**
   ```
   [AppDelegate] ✅ WebViewController class found in Objective-C runtime!
   [AppDelegate] ✅ WebViewController plugin explicitly registered via CAPBridge.registerPlugin()
   [WebViewController] ✅ Plugin loaded and registered!
   ```

## 📝 Alternatif: Proje Dosyasını Manuel Düzenleme

Eğer Xcode'da düzeltme yapamıyorsan, `project.pbxproj` dosyasını manuel olarak düzenleyebilirsin, ancak bu riskli. Xcode'da düzeltmek daha güvenli.

---

**Son Güncelleme:** 2025-11-15
**Durum:** ⏳ Manuel düzeltme gerekiyor

