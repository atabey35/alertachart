# Mac Sistem Verileri Temizlik Rehberi

## Tespit Edilen Büyük Klasörler

### En Büyük Klasörler (Toplam ~30+ GB)

1. **Android SDK**: `~/Library/Android/sdk` - **12 GB**
   - Android geliştirme için gerekli, ancak eski sürümler silinebilir

2. **iOS Simulator**: `~/Library/Developer/CoreSimulator/Devices` - **6.4 GB**
   - Kullanılmayan simulator cihazları silinebilir

3. **iOS Device Support**: `~/Library/Developer/Xcode/iOS DeviceSupport` - **5.2 GB**
   - Eski iOS sürümleri için device support dosyaları

4. **Gradle Cache**: `~/.gradle/caches` - **3.9 GB**
   - Android build cache'leri, güvenle silinebilir

5. **Xcode Archives**: `~/Library/Developer/Xcode/Archives` - **859 MB**
   - Eski app archive'ları, App Store'a yüklenmişse silinebilir

6. **Xcode DerivedData**: `~/Library/Developer/Xcode/DerivedData` - **667 MB**
   - Build cache'leri, güvenle silinebilir

7. **npm Cache**: `~/.npm` - **1.1 GB**
   - npm paket cache'leri, güvenle silinebilir

8. **Library Caches**: `~/Library/Caches` - **1.1 GB**
   - Uygulama cache'leri

9. **Containers**: `~/Library/Containers` - **1.8 GB**
   - Uygulama container'ları

## macOS Depolama Kategorileri Açıklaması

### "Diğer Kullanıcılar" (Other Users)
Bu kategori genellikle şunları içerir:
- `/Users/Shared` klasörü - **36 GB** (sistem güncellemelerinde taşınan dosyalar)
- Diğer kullanıcı hesapları (varsa)
- Sistem tarafından paylaşılan dosyalar

**Önemli:** `/Users/Shared` içindeki "Previously Relocated Items" ve "Relocated Items" klasörleri macOS sistem güncellemeleri sırasında taşınan dosyalardır. Bunlar genellikle güvenle silinebilir, ancak önce içeriğini kontrol edin.

### "Paylaşımlar" (Shared)
Bu kategori genellikle şunları içerir:
- `/Users/Shared` klasörü
- Sistem tarafından paylaşılan cache'ler
- Group Containers (uygulamalar arası paylaşılan veriler)
- Mobile Documents (iCloud Drive dosyaları)

**Tespit Edilen Büyük Paylaşımlar:**
- Telegram Group Container: **9.8 GB** (`~/Library/Group Containers/6N38VWS5BX.ru.keepcoder.Telegram`)
- Canva Container: **808 MB**
- WhatsApp Group Container: **338 MB**

## Temizleme Komutları

### 1. iOS Simulator Temizliği (6.4 GB kazanç)
```bash
# Tüm kullanılmayan simulator'ları sil
xcrun simctl delete unavailable

# Veya belirli simulator'ları listeleyip sil
xcrun simctl list devices
xcrun simctl erase <device-id>
```

### 2. Xcode DerivedData Temizliği (667 MB kazanç)
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 3. Xcode Archives Temizliği (859 MB kazanç)
```bash
# Eski archive'ları sil (App Store'a yüklenmişse güvenle silinebilir)
rm -rf ~/Library/Developer/Xcode/Archives/*
```

### 4. iOS Device Support Temizliği (5.2 GB kazanç)
```bash
# Eski iOS sürümleri için device support dosyalarını sil
# Sadece kullanmadığınız iOS sürümlerini silin
rm -rf ~/Library/Developer/Xcode/iOS\ DeviceSupport/*
```

### 5. Gradle Cache Temizliği (3.9 GB kazanç)
```bash
# Gradle cache'lerini temizle (bir sonraki build'de yeniden indirilecek)
rm -rf ~/.gradle/caches/*
```

### 6. npm Cache Temizliği (1.1 GB kazanç)
```bash
npm cache clean --force
```

### 7. Homebrew Cache Temizliği (310 MB kazanç)
```bash
brew cleanup --prune=all
```

### 8. CocoaPods Cache Temizliği (133 MB kazanç)
```bash
pod cache clean --all
```

### 9. Genel Cache Temizliği
```bash
# Google Chrome cache
rm -rf ~/Library/Caches/Google/Chrome/*

# Diğer uygulama cache'leri (dikkatli olun)
# rm -rf ~/Library/Caches/*
```

### 10. Android SDK Temizliği (12 GB - DİKKATLİ!)

**Mevcut Durum:**
- NDK: 5.4 GB (26.1.10909125: 3.0 GB, 27.1.12297006: 2.4 GB)
- System Images: 4.6 GB (android-36: 2.3 GB, android-36.1: 2.3 GB)
- Emulator: 971 MB
- Build Tools: 754 MB (4 versiyon: 36.1.0, 36.0.0, 35.0.0, 34.0.0)
- Platforms: 264 MB (android-35: 130 MB, android-36: 134 MB)

**Projeniz Android 35 kullanıyor**, bu yüzden:

```bash
# 1. Android 36 platform'unu sil (şu an kullanılmıyor) - 134 MB
rm -rf ~/Library/Android/sdk/platforms/android-36

# 2. Android 36.1 system image'ini sil (kullanılmıyor) - 2.3 GB
rm -rf ~/Library/Android/sdk/system-images/android-36.1

# 3. Eski NDK versiyonunu sil (sadece birini tutun) - 2.4-3.0 GB
# Hangi NDK versiyonunu kullandığınızı kontrol edin
# Genellikle en yeni versiyonu tutmak yeterli
rm -rf ~/Library/Android/sdk/ndk/26.1.10909125  # Eski versiyon

# 4. Eski build-tools versiyonlarını sil - ~400 MB
# Sadece en yeni 2 versiyonu tutun
rm -rf ~/Library/Android/sdk/build-tools/34.0.0  # Eski
rm -rf ~/Library/Android/sdk/build-tools/36.0.0  # Eski (36.1.0 var)

# Toplam kazanç: ~5-6 GB
```

### 11. Sistem Log Dosyaları Temizliği (1.9 GB kazanç)
```bash
# Diagnostics log dosyaları
sudo rm -rf /private/var/db/diagnostics/Special/*
sudo rm -rf /private/var/db/diagnostics/Persist/*
sudo rm -rf /private/var/db/diagnostics/Signpost/*

# Power log dosyaları
sudo rm -rf /private/var/db/powerlog/*

# System stats
sudo rm -rf /private/var/db/systemstats/*
```

### 12. Sleep Image Temizliği (2 GB kazanç - DİKKATLİ!)
```bash
# Sleep image dosyası (uyku modu için kullanılan RAM yedeği)
# Bu dosya silinirse bir sonraki uyku modunda yeniden oluşturulur
sudo rm /private/var/vm/sleepimage
```

### 13. /Users/Shared Temizliği (36 GB - ÇOK DİKKATLİ!)
```bash
# Önce içeriği kontrol edin!
ls -lah /Users/Shared/

# "Previously Relocated Items" klasörleri genellikle güvenle silinebilir
# Bunlar macOS sistem güncellemelerinde taşınan dosyalardır
sudo rm -rf "/Users/Shared/Previously Relocated Items"*
sudo rm -rf "/Users/Shared/Relocated Items"

# Epic Games ve UnrealEngine klasörlerini kontrol edin
# Eğer kullanmıyorsanız silebilirsiniz
# sudo rm -rf "/Users/Shared/Epic Games"
# sudo rm -rf "/Users/Shared/UnrealEngine"
```

### 14. Telegram Cache Temizliği (9.8 GB kazanç)
```bash
# Telegram uygulamasının cache'lerini temizle
rm -rf ~/Library/Group\ Containers/6N38VWS5BX.ru.keepcoder.Telegram/appstore/*
```

### 15. Canva Cache Temizliği (808 MB kazanç)
```bash
# Canva uygulamasının cache'lerini temizle
rm -rf ~/Library/Containers/com.canva.canvaeditor/*
```

## Güvenli Toplu Temizlik Script'i

Aşağıdaki komutları sırayla çalıştırabilirsiniz:

```bash
# 1. iOS Simulator temizliği
xcrun simctl delete unavailable

# 2. Xcode DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 3. Xcode Archives (App Store'a yüklenmişse)
rm -rf ~/Library/Developer/Xcode/Archives/*

# 4. Gradle cache
rm -rf ~/.gradle/caches/*

# 5. npm cache
npm cache clean --force

# 6. Homebrew
brew cleanup --prune=all

# 7. CocoaPods
pod cache clean --all

# 8. Telegram cache
rm -rf ~/Library/Group\ Containers/6N38VWS5BX.ru.keepcoder.Telegram/appstore/*

# 9. Sistem log dosyaları (sudo gerekli)
sudo rm -rf /private/var/db/diagnostics/Special/*
sudo rm -rf /private/var/db/diagnostics/Persist/*
sudo rm -rf /private/var/db/powerlog/*
```

**Toplam kazanç: ~30-35 GB** (Android SDK ve /Users/Shared hariç)

## Dikkat Edilmesi Gerekenler

1. **iOS Device Support**: Sadece kullanmadığınız iOS sürümlerini silin
2. **Xcode Archives**: App Store'a yüklenmiş archive'ları güvenle silebilirsiniz
3. **Android SDK**: Sadece kullanmadığınız platform sürümlerini silin
4. **DerivedData ve Cache'ler**: Bunlar bir sonraki build'de otomatik oluşacak, güvenle silinebilir
5. **/Users/Shared**: İçeriğini mutlaka kontrol edin! Önemli dosyalar olabilir
6. **Sleep Image**: Silinirse bir sonraki uyku modunda yeniden oluşturulur
7. **Sistem Log Dosyaları**: sudo gerektirir, dikkatli olun

## Ek Kontroller

99 GB'ın tamamını açıklamak için şunları da kontrol edin:

```bash
# Time Machine yerel snapshot'ları
tmutil listlocalsnapshots /

# Docker image'ları (varsa)
docker system prune -a

# Mail cache'leri
du -sh ~/Library/Mail/*

# Spotlight index
sudo mdutil -E /

# Time Machine yerel snapshot'larını sil
sudo tmutil deletelocalsnapshots <snapshot-date>
```

## Windsurf Temizliği (Tamamlandı ✅)

Windsurf ile ilgili tüm dosyalar ve cache'ler silindi:
- `~/Library/Application Support/Windsurf` (458 MB)
- `~/Library/Caches/com.exafunction.windsurf*`
- `~/Library/HTTPStorages/com.exafunction.windsurf*`
- `~/Library/Preferences/*windsurf*`
- `~/Library/Application Support/CrashReporter/*Windsurf*`
