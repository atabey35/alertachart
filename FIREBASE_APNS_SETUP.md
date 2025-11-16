# Firebase APNs Yapılandırma Rehberi

## Sorun: `messaging/third-party-auth-error`

Bu hata, Firebase Cloud Messaging'in Apple Push Notification Service (APNs) ile iletişim kurarken authentication sorunu yaşadığını gösterir.

## Çözüm Adımları

### 1. Apple Developer Portal'da APNs Key Oluşturma

1. [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list) adresine gidin
2. **Keys** bölümüne gidin
3. **+** butonuna tıklayarak yeni bir key oluşturun
4. **Key Name** girin (örn: "Alerta Chart Push Notifications")
5. **Apple Push Notifications service (APNs)** seçeneğini işaretleyin
6. **Continue** ve ardından **Register** butonuna tıklayın
7. **Download** butonuna tıklayarak `.p8` dosyasını indirin (sadece bir kez indirilebilir!)
8. **Key ID**'yi not edin (örn: `ABC123XYZ`)

### 2. Firebase Console'da APNs Yapılandırması

1. [Firebase Console](https://console.firebase.google.com/) adresine gidin
2. Projenizi seçin
3. Sol menüden **⚙️ Project Settings** (Proje Ayarları) seçeneğine tıklayın
4. **Cloud Messaging** tab'ına gidin
5. **Apple app configuration** bölümünde:
   - **APNs Authentication Key** seçeneğini seçin
   - **Upload** butonuna tıklayın
   - İndirdiğiniz `.p8` dosyasını yükleyin
   - **Key ID**'yi girin (Apple Developer Portal'dan aldığınız)
   - **Team ID**'yi girin (Apple Developer Portal'da sağ üstte görünür)
6. **Upload** butonuna tıklayın

### 3. Bundle ID Kontrolü

1. Firebase Console'da **Project Settings > General** tab'ına gidin
2. **Your apps** bölümünde iOS uygulamanızı bulun
3. **Bundle ID**'nin Xcode'daki Bundle Identifier ile eşleştiğinden emin olun
4. Eşleşmiyorsa:
   - Yeni bir iOS app ekleyin veya
   - Mevcut app'in Bundle ID'sini güncelleyin

### 4. GoogleService-Info.plist Kontrolü

1. Xcode'da `ios/App/App/GoogleService-Info.plist` dosyasını açın
2. `BUNDLE_ID` değerinin Xcode'daki Bundle Identifier ile eşleştiğinden emin olun
3. Eşleşmiyorsa, Firebase Console'dan doğru `GoogleService-Info.plist` dosyasını indirip değiştirin

### 5. Development vs Production

**Önemli:** APNs key'leri hem development hem production için çalışır. Ancak:

- **Development Build**: Xcode'dan direkt build alıyorsanız, development APNs kullanılır
- **Production Build**: App Store veya TestFlight'tan yüklüyorsanız, production APNs kullanılır

Firebase Console'da yüklediğiniz APNs key her iki ortam için de çalışır.

### 6. Doğrulama

1. Firebase Console'da **Cloud Messaging** tab'ına gidin
2. **Apple app configuration** bölümünde:
   - ✅ **APNs Authentication Key** yüklü olmalı
   - ✅ **Key ID** görünür olmalı
   - ✅ **Team ID** görünür olmalı

### 7. Test

1. Uygulamayı gerçek bir iOS cihazda çalıştırın (Simulator'de push notifications çalışmaz)
2. Admin panelinden bir broadcast gönderin
3. Backend log'larında `messaging/third-party-auth-error` hatası görünmemeli
4. Bildirim iOS cihazında görünmelidir

## Yaygın Hatalar ve Çözümleri

### Hata: "Invalid APNs key"
- **Çözüm**: `.p8` dosyasının doğru key'den indirildiğinden emin olun
- Key ID'nin doğru girildiğinden emin olun

### Hata: "Team ID mismatch"
- **Çözüm**: Apple Developer Portal'dan doğru Team ID'yi alın
- Firebase Console'da Team ID'yi güncelleyin

### Hata: "Bundle ID mismatch"
- **Çözüm**: Firebase Console'daki Bundle ID ile Xcode'daki Bundle Identifier'ın eşleştiğinden emin olun

### Hata: "Key not found"
- **Çözüm**: APNs key'inin Apple Developer Portal'da oluşturulduğundan emin olun
- Key ID'nin doğru girildiğinden emin olun

## Notlar

- APNs key'leri hem development hem production için çalışır
- `.p8` dosyası sadece bir kez indirilebilir - güvenli bir yerde saklayın
- Key ID ve Team ID'yi not edin - Firebase Console'a girerken gerekli
- Bundle ID değişirse, Firebase Console'da da güncellemeniz gerekir

## Ek Kaynaklar

- [Firebase Cloud Messaging iOS Setup](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [APNs Authentication Key Setup](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns)

