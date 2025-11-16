# 🧹 Proje Temizlik Analizi Raporu

## 📊 Mevcut Durum

**Stack:** Next.js (App Router) + Capacitor (Android + iOS WebView)
**Aktif Projeler:**
- ✅ `ios/App/` - Capacitor iOS projesi (AKTİF)
- ✅ `android/` - Capacitor Android projesi (AKTİF)
- ✅ Root Next.js projesi (AKTİF)

---

## 🗑️ GEREKSİZ DOSYALAR (SİLİNEBİLİR)

### 1. ❌ ESKİ iOS PROJESİ (Tamamen Gereksiz)
```
alertachart/
├── alertachart/
│   ├── alertachart/
│   │   ├── alertachartApp.swift
│   │   ├── ContentView.swift
│   │   └── Assets.xcassets/
│   └── alertachart.xcodeproj/
```
**Sebep:** Eski SwiftUI projesi. Capacitor kullanıldığı için gereksiz. Gerçek iOS projesi `ios/App/` klasöründe.

### 2. ❌ EXPO REACT NATIVE PROJESİ (Gereksiz)
```
mobile/
├── ios/                    # Expo iOS projesi
├── android/                # Expo Android projesi
├── src/                    # React Native kodları
├── assets/                 # Expo assets
├── package.json           # Expo dependencies
├── app.json               # Expo config
└── [124 dosya - 33 md, 19 png, 15 webp, ...]
```
**Sebep:** Capacitor kullanılıyor, Expo gereksiz. Tüm mobile klasörü silinebilir.

### 3. ❌ TEST DOSYALARI
```
test-pine-script.txt
test-pine-script-2.txt
test-pine-script-3.txt
```
**Sebep:** Geçici test dosyaları, gereksiz.

### 4. ❌ ESKİ DOKÜMANTASYON DOSYALARI (97+ markdown)
**Kategoriler:**
- Build guide'ları (eski): `IOS_BUILD_*.md`, `XCODE_*.md`
- Eski issue fix'leri: `*_FIX.md`, `*_ISSUE.md`, `*_ROADMAP.md`
- Eski planlar: `*_PLAN.md`, `*_PROPOSAL.md`
- Eski test guide'ları: `tests/*.md` (bazıları)
- Eski setup guide'ları: `mobile/*.md` (çoğu)

**Öneri:** Sadece aktif kullanılan dokümantasyonları tut:
- ✅ `README.md` - Ana readme
- ✅ `SETUP_GUIDE.md` - Güncel setup
- ✅ `DATABASE_SETUP.md` - DB setup
- ✅ `FCM_SETUP.md` - FCM setup
- ✅ `VERCEL_DEPLOY.md` - Deploy guide
- ❌ Diğerleri - Eski/geçici dokümantasyon

### 5. ❌ BUILD KLASÖRLERİ (Gitignore'a eklenmeli)
```
android/app/build/          # Android build artifacts
android/build/              # Android build cache
ios/App/Pods/               # CocoaPods (zaten .gitignore'da olmalı)
ios/App/App.xcworkspace/xcuserdata/  # Xcode user data
```

### 6. ❌ LOG DOSYALARI
```
alert_logs.txt
```

### 7. ❌ GEREKSİZ SCRIPT DOSYALARI (Kontrol edilmeli)
```
check-device.sh            # Kullanılıyor mu?
get-android-logs.sh        # Kullanılıyor mu?
get-physical-device-logs.sh # Kullanılıyor mu?
prepare-ios-build.sh       # Kullanılıyor mu?
API_TEST_COMMANDS.sh       # Kullanılıyor mu?
```

---

## ✅ KORUNMASI GEREKEN DOSYALAR

### Aktif Proje Dosyaları
```
app/                       # Next.js App Router
components/               # React components
workers/                  # Web Workers
services/                 # Backend services
utils/                    # Utilities
types/                    # TypeScript types
lib/                      # Libraries
database/                 # SQL schemas
scripts/                  # Aktif scriptler (kontrol edilmeli)
public/                   # Public assets
```

### Capacitor Konfigürasyonları
```
capacitor.config.ts       # Capacitor config
ios/App/                  # Capacitor iOS projesi
android/                  # Capacitor Android projesi
```

### Gerekli Dokümantasyon
```
README.md
SETUP_GUIDE.md
DATABASE_SETUP.md
FCM_SETUP.md
VERCEL_DEPLOY.md
SPEC.md
```

### Konfigürasyon Dosyaları
```
package.json
tsconfig.json
next.config.js
tailwind.config.ts
postcss.config.js
vercel.json
eas.json
.gitignore
```

---

## 📋 TEMİZLİK ÖNCELİKLERİ

### 🔴 YÜKSEK ÖNCELİK (Hemen Silinebilir)
1. `alertachart/` klasörü (tamamen)
2. `mobile/` klasörü (tamamen)
3. `test-pine-script*.txt` dosyaları
4. `alert_logs.txt`

### 🟡 ORTA ÖNCELİK (Kontrol Sonrası)
1. Eski markdown dokümantasyonları (97+ dosya)
2. Script dosyaları (kullanım kontrolü)
3. Build klasörleri (gitignore kontrolü)

### 🟢 DÜŞÜK ÖNCELİK (Organizasyon)
1. Dokümantasyon klasörü oluşturup eski dosyaları taşıma
2. `.gitignore` güncelleme

---

## 🎯 ÖNERİLEN AKSİYON PLANI

### Adım 1: Güvenli Silme
```bash
# 1. Eski iOS projesi
rm -rf alertachart/

# 2. Expo mobile projesi
rm -rf mobile/

# 3. Test dosyaları
rm test-pine-script*.txt
rm alert_logs.txt
```

### Adım 2: Gitignore Güncelleme
```gitignore
# Build artifacts
/android/app/build/
/android/build/
/ios/App/Pods/
/ios/App/App.xcworkspace/xcuserdata/
*.xcuserstate
*.xcuserdatad/

# Logs
*.log
alert_logs.txt
```

### Adım 3: Dokümantasyon Temizliği
- Aktif kullanılan 5-6 dokümantasyonu tut
- Eski dokümantasyonları `docs/archive/` klasörüne taşı veya sil

### Adım 4: Script Kontrolü
- Her script dosyasını kontrol et
- Kullanılmayanları sil
- Kullanılanları `scripts/` klasörüne taşı

---

## 📊 BEKLENEN TEMİZLİK SONUÇLARI

**Silinecek:**
- ~150+ dosya (alertachart/ + mobile/)
- ~97 markdown dosyası (çoğu)
- ~5 test/script dosyası

**Tasarruf:**
- Disk alanı: ~500MB - 1GB
- Proje karmaşıklığı: %60 azalma
- Bakım kolaylığı: Önemli ölçüde artış

---

## ⚠️ DİKKAT

1. **Yedekleme:** Silmeden önce git commit yapın
2. **Test:** Silme sonrası build testleri yapın
3. **Gitignore:** Build klasörlerini gitignore'a ekleyin
4. **Dokümantasyon:** Önemli bilgileri README'ye taşıyın

---

**Hazırlayan:** AI Assistant
**Tarih:** 2025-01-XX
**Durum:** Analiz Tamamlandı ✅

