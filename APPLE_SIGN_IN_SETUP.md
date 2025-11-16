# Apple Sign-In Yapılandırma Kontrol Rehberi

## 📋 Mevcut Bilgileriniz

- **Team ID**: `P6NB9T5SQ9`
- **Bundle ID**: `com.kriptokirmizi.alerta`
- **Service ID**: `com.kriptokirmizi.alerta.signin`
- **Redirect URI**: `https://alertachart.com/auth/mobile-callback`

---

## 🔍 Apple Developer Console'da Kontrol Adımları

### 1. Apple Developer Console'a Giriş

1. [Apple Developer Portal](https://developer.apple.com/account/) adresine gidin
2. Apple ID'nizle giriş yapın
3. Sağ üstte **Team ID**'nizi görün: `P6NB9T5SQ9`

### 2. Service ID Kontrolü ve Yapılandırması

#### 2.1. Service ID'yi Bulma

1. Sol menüden **Certificates, Identifiers & Profiles** seçeneğine tıklayın
2. Sol sidebar'dan **Identifiers** seçeneğine tıklayın
3. **+** (artı) butonuna tıklayın (yeni Service ID oluşturmak için)
   - VEYA mevcut Service ID'yi aramak için üstteki arama kutusuna `com.kriptokirmizi.alerta.signin` yazın

#### 2.2. Service ID Oluşturma (Eğer Yoksa)

1. **Services IDs** seçeneğini seçin
2. **Continue** butonuna tıklayın
3. **Description**: `Alerta Chart Sign In` yazın
4. **Identifier**: `com.kriptokirmizi.alerta.signin` yazın
5. **Continue** → **Register** butonuna tıklayın

#### 2.3. Service ID Yapılandırması

1. Service ID listesinden `com.kriptokirmizi.alerta.signin` seçeneğine tıklayın
2. **Sign In with Apple** seçeneğini işaretleyin
3. **Configure** butonuna tıklayın

#### 2.4. Redirect URI Ekleme

**Primary App ID** bölümünde:
1. **Select a primary App ID** dropdown'ından `com.kriptokirmizi.alerta` seçin
2. **Domains and Subdomains** bölümünde:
   - **Website URLs** altında **+** butonuna tıklayın
   - **Domain**: `alertachart.com` yazın
   - **Return URLs** altında **+** butonuna tıklayın
   - **Return URL**: `https://alertachart.com/auth/mobile-callback` yazın
3. **Save** butonuna tıklayın
4. Ana sayfaya dönmek için **Continue** → **Save** butonuna tıklayın

### 3. Bundle ID (App ID) Kontrolü

1. **Identifiers** sayfasında **App IDs** seçeneğine tıklayın
2. `com.kriptokirmizi.alerta` arayın
3. Tıklayın ve kontrol edin:
   - ✅ **Sign In with Apple** capability aktif olmalı
   - ✅ **Configure** butonuna tıklayın
   - ✅ **Enable as a primary App ID** seçeneği işaretli olmalı

### 4. Doğrulama Kontrol Listesi

Aşağıdakilerin hepsi doğru olmalı:

- [ ] Service ID `com.kriptokirmizi.alerta.signin` mevcut
- [ ] Service ID'de **Sign In with Apple** aktif
- [ ] Primary App ID olarak `com.kriptokirmizi.alerta` seçili
- [ ] Domain: `alertachart.com` eklenmiş
- [ ] Return URL: `https://alertachart.com/auth/mobile-callback` eklenmiş
- [ ] Bundle ID `com.kriptokirmizi.alerta` mevcut
- [ ] Bundle ID'de **Sign In with Apple** capability aktif

---

## 🚨 Yaygın Hatalar ve Çözümleri

### Hata: "The operation couldn't be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)"

**Olası Nedenler:**
1. Service ID yanlış veya eksik
2. Redirect URI Apple Developer Console'da tanımlı değil
3. Bundle ID ile Service ID ilişkilendirilmemiş

**Çözüm:**
1. Yukarıdaki adımları tekrar kontrol edin
2. Service ID'nin Primary App ID olarak doğru Bundle ID'yi kullandığından emin olun
3. Redirect URI'nin tam olarak `https://alertachart.com/auth/mobile-callback` olduğunu kontrol edin (trailing slash olmamalı)

### Hata: "Invalid client"

**Çözüm:**
- Service ID'nin doğru olduğundan emin olun: `com.kriptokirmizi.alerta.signin`
- Kodda Bundle ID yerine Service ID kullanıldığından emin olun

---

## 📝 Environment Variables (Opsiyonel)

Eğer farklı bir Service ID veya Redirect URI kullanmak isterseniz:

```env
# .env.local
NEXT_PUBLIC_APPLE_SERVICE_ID=com.kriptokirmizi.alerta.signin
NEXT_PUBLIC_APPLE_REDIRECT_URI=https://alertachart.com/auth/mobile-callback
```

---

## ✅ Test Etme

1. **Android cihazda**: "Continue with Apple" butonuna basın
2. **iOS cihazda**: "Continue with Apple" butonuna basın
3. **Web'de**: "Continue with Apple" butonuna basın

Eğer hala Error 1000 alıyorsanız:
- Apple Developer Console'da yapılandırmayı tekrar kontrol edin
- Değişikliklerin yayılması için 5-10 dakika bekleyin
- Uygulamayı tamamen kapatıp yeniden açın

---

## 🔗 Yararlı Linkler

- [Apple Developer Portal](https://developer.apple.com/account/)
- [Sign In with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Service ID Configuration Guide](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user)

