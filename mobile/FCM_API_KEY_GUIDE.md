# FCM API Key Ekleme - Adım Adım

## EAS Credentials Menüsünde:

1. **"Push Notifications (Legacy): Manage your FCM (Legacy) API Key"** seçeneğini seçin
2. "Set up FCM (Legacy) API Key" seçeneğini seçin

## Firebase Console'dan Server Key Alın:

1. [Firebase Console](https://console.firebase.google.com/) → Projenize gidin
2. Sol menüden **⚙️ Project Settings** (Proje Ayarları) tıklayın
3. Üst menüden **Cloud Messaging** sekmesine gidin
4. **"Server key"** veya **"Legacy server key"** bulun
5. Key'i kopyalayın (uzun bir string, AIza... ile başlar)

## EAS'a Ekleyin:

1. EAS credentials menüsünde Server Key'i yapıştırın
2. Enter'a basın
3. Onaylayın

## Sonra:

```bash
eas build --platform android --profile production
```

## Not:

- `google-services.json` dosyası zaten `android/app/` klasöründe
- FCM Legacy API Key'i EAS credentials'a eklemek gerekiyor
- Her ikisi de build sırasında kullanılacak











