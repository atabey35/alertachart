# Google Auth SHA-1 Fingerprint Sorunu - Çözüm

## 🔴 Sorun

**APK olarak yüklediğinizde çalışıyor** ama **Google Play'den indirdiğinizde "Something went wrong" hatası alıyorsunuz.**

**Neden?**
- APK → Release keystore SHA-1 kullanıyor
- Google Play → Google Play App Signing SHA-1 kullanıyor (farklı!)
- Firebase'de sadece release keystore SHA-1 kayıtlı
- Google Play App Signing SHA-1 kayıtlı değil

---

## ✅ Çözüm: Google Play App Signing SHA-1'i Firebase'e Ekle

### Adım 1: Google Play App Signing SHA-1'i Al

1. [Google Play Console](https://play.google.com/console) → Uygulamanızı seçin
2. Sol menüden **Setup** → **App signing** seçin
3. **App signing key certificate** bölümünde **SHA-1 certificate fingerprint**'i kopyalayın
   - Format: `XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX`

**Örnek:**
```
03:7C:A0:05:9F:C1:0C:C7:86:95:8C:27:94:95:67:D7:CC:0C:FA:F2
```

### Adım 2: Firebase Console'da SHA-1'i Ekle

1. [Firebase Console](https://console.firebase.google.com/) → Projenizi seçin
2. Sol menüden **Project Settings** (⚙️) seçin
3. Aşağı kaydırın, **Your apps** bölümünde Android uygulamanızı bulun
4. **SHA certificate fingerprints** bölümüne tıklayın
5. **Add fingerprint** butonuna tıklayın
6. Google Play App Signing SHA-1'i yapıştırın: `10:76:d8:08:ed:f5:eb:6b:19:e6:96:12:76:ea:a1:cc:b6:98:e7:99`
7. **Save** butonuna tıklayın

### Adım 2b: Google Cloud Console'da OAuth Client ID'ye SHA-1'i Ekle (ÖNEMLİ!)

**Firebase'de eklemek yeterli değil! Google Cloud Console'da da eklemelisiniz:**

1. [Google Cloud Console](https://console.cloud.google.com/) → Projenizi seçin
2. Sol menüden **APIs & Services** → **Credentials** seçin
3. **OAuth 2.0 Client IDs** bölümünde Android client ID'nizi bulun (ör: "Alerta Chart - Android")
4. Client ID'ye tıklayın
5. **SHA-1 certificate fingerprint** alanına **App Signing SHA-1**'i ekleyin:
   - `10:76:d8:08:ed:f5:eb:6b:19:e6:96:12:76:ea:a1:cc:b6:98:e7:99`
6. **Not:** Upload Key SHA-1 zaten varsa, onu silmeyin! **Her ikisini de ekleyin:**
   - Upload Key SHA-1: `03:7C:A0:05:9F:C1:0C:C7:86:95:8C:27:94:95:67:D7:CC:0C:FA:F2` (APK test için)
   - App Signing SHA-1: `10:76:d8:08:ed:f5:eb:6b:19:e6:96:12:76:ea:a1:cc:b6:98:e7:99` (Google Play için)
7. **Save** butonuna tıklayın

### Adım 3: google-services.json'u Yeniden İndir

1. Firebase Console → **Project Settings** → **Your apps**
2. Android uygulamanızın yanında **google-services.json** butonuna tıklayın
3. Dosyayı indirin
4. `android/app/google-services.json` dosyasını güncelleyin

### Adım 4: Yeni Build Al

1. Yeni build alın (SHA-1 değiştiği için)
2. Google Play'e yükleyin
3. Test edin

---

## 🔍 Kontrol: SHA-1'ler Eşleşiyor mu?

### Mevcut Keystore SHA-1 (Upload Key)

```bash
cd android/app
keytool -list -v -keystore upload-key.keystore -alias upload | grep SHA1
```

### Google Play App Signing SHA-1

Google Play Console → **Setup** → **App signing** → **App signing key certificate** → **SHA-1**

### Firebase'de Kayıtlı SHA-1'ler

Firebase Console → **Project Settings** → **Your apps** → Android app → **SHA certificate fingerprints**

**Hepsi eşleşmeli:**
- ✅ Upload key SHA-1 (Firebase'de kayıtlı)
- ✅ Google Play App Signing SHA-1 (Firebase'de kayıtlı) ← **Bu eksik olabilir!**

---

## 📋 Checklist

- [ ] Google Play Console'dan App Signing SHA-1'i aldım
- [ ] Firebase Console'da SHA-1'i ekledim
- [ ] **Google Cloud Console'da OAuth Client ID'ye SHA-1'i ekledim** ← ÖNEMLİ!
- [ ] google-services.json'u yeniden indirdim
- [ ] Yeni build aldım
- [ ] Google Play'e yükledim
- [ ] Test ettim - Google Auth çalışıyor

---

## ⚠️ Önemli Notlar

1. **Google Play App Signing kullanıyorsanız:**
   - Google Play'in kendi signing key'i var
   - Bu key'in SHA-1'i Firebase'de kayıtlı olmalı
   - Upload key SHA-1'i yeterli değil!

2. **İki SHA-1 gerekli (her ikisi de Firebase VE Google Cloud Console'da kayıtlı olmalı):**
   - Upload key SHA-1 (APK build için): `03:7C:A0:05:9F:C1:0C:C7:86:95:8C:27:94:95:67:D7:CC:0C:FA:F2`
   - Google Play App Signing SHA-1 (Play Store build için): `10:76:d8:08:ed:f5:eb:6b:19:e6:96:12:76:ea:a1:cc:b6:98:e7:99`

3. **Google Cloud Console OAuth Client ID:**
   - Firebase'de SHA-1 eklemek yeterli değil!
   - Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
   - Android client ID'de **her iki SHA-1** de kayıtlı olmalı

4. **google-services.json:**
   - SHA-1 eklendikten sonra yeniden indirilmeli
   - `oauth_client` bölümü dolu olmalı

---

## 🔧 Hızlı Test

Firebase'de SHA-1'lerin doğru olduğunu kontrol edin:

1. Firebase Console → **Project Settings** → **Your apps** → Android app
2. **SHA certificate fingerprints** bölümünde:
   - Upload key SHA-1 görünmeli
   - Google Play App Signing SHA-1 görünmeli

Eğer Google Play App Signing SHA-1 yoksa → **Ekle!**

---

## 📚 Kaynaklar

- [Firebase SHA-1 Configuration](https://firebase.google.com/docs/android/setup#add-sha)
- [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)

