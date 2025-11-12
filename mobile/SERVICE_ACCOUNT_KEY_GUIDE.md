# FCM V1 Service Account Key Oluşturma

## Adım 1: Firebase Console'da Service Account Oluştur

1. Firebase Console → **"Service accounts"** sekmesine gidin
2. Veya direkt: [Firebase Service Accounts](https://console.firebase.google.com/project/alerta-b8df2/settings/serviceaccounts/adminsdk)
3. **"Generate new private key"** butonuna tıklayın
4. Uyarıyı onaylayın
5. JSON dosyası indirilecek (örn: `alerta-b8df2-xxxxx.json`)

## Adım 2: EAS Credentials'a Ekle

EAS menüsünde:
1. **"Push Notifications (FCM V1): Google Service Account Key"** seçeneğini seçin
2. İndirdiğiniz Service Account JSON dosyasını yükleyin

## Adım 3: Yeni Build Al

```bash
eas build --platform android --profile production
```

## Alternatif: Legacy API'yi Etkinleştir

Eğer Service Account kullanmak istemiyorsanız:

1. Firebase Console → Cloud Messaging sekmesinde
2. "Cloud Messaging API (Legacy)" bölümünü bulun
3. "Enable" butonuna tıklayın (varsa)
4. Etkinleştirdikten sonra sayfayı yenileyin
5. "Server key" görünecek










