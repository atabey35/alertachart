# iOS WebViewController Plugin Fix - Kademe Kademe Roadmap

## 🎯 Hedef

iOS'ta `WebViewController` plugin'ini Capacitor 7'de çalışır hale getirmek.

## 📋 Durum Özeti

**Sorun:** Plugin Objective-C runtime'da var ama Capacitor keşfetmiyor, `load()` çağrılmıyor, JavaScript tarafında görünmüyor.

**Kök Neden:** Capacitor 6→7 ile iOS plugin discovery mekanizması değişti. `packageClassList` tek başına yeterli değil, explicit registration gerekebiliyor.

## 🗺️ Roadmap - Adım Adım

### ✅ Adım 1: Xcode Dosya & Target Membership (KRİTİK)

**Durum:** 🔴 SORUN TESPİT EDİLDİ - Target Membership işaretli değil

**Sorun:** `WebViewController.swift` dosyası Xcode'da görünüyor ancak "Target Membership: App" işaretli değil. Bu durumda dosya derlenmez.

**Çözüm - Adım Adım:**

1. **Xcode'u aç:**
   ```bash
   npx cap open ios
   ```

2. **Dosyayı bul:**
   - Sol panelde `App/App` klasörüne git
   - `WebViewController.swift` dosyasını bul

3. **Target Membership'i düzelt:**
   - `WebViewController.swift` dosyasına tıkla
   - Sağ panelde "File Inspector" sekmesine git (sol üstteki dosya ikonu 📄)
   - "Target Membership" bölümünü bul
   - **"App" checkbox'ını işaretle** ✅

4. **Clean ve Build:**
   ```
   Product → Clean Build Folder (⇧⌘K)
   Product → Build (⌘B)
   ```

**Alternatif Yöntem (Eğer yukarıdaki işe yaramazsa):**
1. Xcode'da `WebViewController.swift` dosyasına sağ tıkla
2. "Delete" seç → "Remove Reference" seç (dosyayı silme!)
3. File → Add Files to "App"...
4. `ios/App/App/WebViewController.swift` seç
5. **"Add to targets: App" checkbox'ını işaretle** ✅
6. "Copy items if needed" işaretli OLMASIN
7. Add'e tıkla

**Kontrol:**
- [ ] `WebViewController.swift` Xcode'da görünüyor
- [ ] **"Target Membership: App" işaretli** ← ŞU AN İŞARETLİ DEĞİL, DÜZELT!

---

### ✅ Adım 2: Plugin Swift Dosyasını Capacitor 7 Uyumlu Güncelle

**Durum:** ✅ TAMAMLANDI

**Yapılan Değişiklikler:**
- ✅ `public static let identifier = "WebViewController"` eklendi
- ✅ `public static let jsName = "WebViewController"` eklendi
- ✅ `@objc` annotation'lar mevcut ve doğru
- ✅ Debug log'ları eklendi

**Dosya:** `ios/App/App/WebViewController.swift`

---

### ✅ Adım 3: CAPBridge.registerPlugin ile Explicit Registration

**Durum:** ✅ TAMAMLANDI

**Yapılan Değişiklikler:**
- ✅ `AppDelegate.swift` içinde `CAPBridge.registerPlugin(WebViewController.self)` eklendi
- ✅ `didFinishLaunchingWithOptions` içinde çağrılıyor
- ✅ Debug log'ları eklendi

**Dosya:** `ios/App/App/AppDelegate.swift`

**Kod:**
```swift
CAPBridge.registerPlugin(WebViewController.self)
print("[AppDelegate] ✅ WebViewController plugin explicitly registered via CAPBridge.registerPlugin()")
```

---

### ✅ Adım 4: JS Tarafı Eşleştirmesi

**Durum:** ✅ KONTROL EDİLDİ - DOĞRU

**Kontrol Sonucu:**
- ✅ JavaScript tarafında `window.Capacitor?.Plugins?.WebViewController` kullanılıyor
- ✅ Plugin ismi `WebViewController` ile eşleşiyor
- ✅ `loadUrl()` metodu doğru çağrılıyor

**Dosya:** `public/index.html`

---

### ✅ Adım 5: Sync, Pods ve Rebuild

**Durum:** ✅ TAMAMLANDI

**Yapılan Komutlar:**
```bash
✅ npx cap sync ios - Tamamlandı
✅ packageClassList güncellendi
```

**Yapılması Gerekenler:**
- [ ] Xcode'da Clean Build Folder (⇧⌘K)
- [ ] Xcode'da Build (⌘B)
- [ ] Xcode'da Run (gerçek cihaz veya simulator)

---

### ✅ Adım 6: Debug Log Kontrolü

**Durum:** ⏳ Test sonrası

**Beklenen Log'lar:**
```
[AppDelegate] ✅ WebViewController class found in Objective-C runtime!
[WebViewController] ✅ Plugin loaded and registered!
[Login] ✅ Using WebViewController plugin
```

---

## 📝 Detaylı Adımlar

### Adım 2: Plugin Swift Dosyası Güncelleme

**Dosya:** `ios/App/App/WebViewController.swift`

**Değişiklikler:**
- `public static let identifier = "WebViewController"` eklenecek
- `public static let jsName = "WebViewController"` eklenecek
- Mevcut kod korunacak

### Adım 3: AppDelegate.swift Güncelleme

**Dosya:** `ios/App/App/AppDelegate.swift`

**Değişiklikler:**
- `didFinishLaunchingWithOptions` içine `CAPBridge.registerPlugin(WebViewController.self)` eklenecek
- Import kontrolü yapılacak

### Adım 4: JavaScript Kontrolü

**Dosya:** `public/index.html`

**Kontrol:**
- `window.Capacitor?.Plugins?.WebViewController` kullanımı doğru mu?
- Plugin ismi `WebViewController` ile eşleşiyor mu?

---

## 🚀 Uygulama Sırası

1. ✅ Adım 2: Plugin Swift dosyasını güncelle
2. ✅ Adım 3: AppDelegate'e explicit registration ekle
3. ✅ Adım 4: JavaScript kullanımını kontrol et
4. ✅ Adım 5: Sync ve rebuild yap
5. ⏳ Adım 1: Xcode'da dosya kontrolü (manuel)
6. ⏳ Adım 6: Test ve log kontrolü

---

## ✅ Başarı Kriterleri

- [ ] `[WebViewController] ✅ Plugin loaded and registered!` log'u görünüyor
- [ ] JavaScript console'da `Available plugins` listesinde `WebViewController` var
- [ ] `[Login] ✅ Using WebViewController plugin` log'u görünüyor
- [ ] Google Sign-In sonrası remote URL yükleniyor (Safari açılmıyor)

---

**Son Güncelleme:** 2025-11-15
**Durum:** 🔄 Roadmap oluşturuldu, adımlar uygulanıyor

