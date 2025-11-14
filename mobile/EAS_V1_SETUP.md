# EAS FCM V1 Service Account Key Ekleme

## Şu Anda:
EAS menüsünde "Upload an FCM API Key" ekranındasınız.

## Yapmanız Gerekenler:

1. **Ctrl+C** ile çıkış yapın (veya mevcut ekranı iptal edin)

2. Tekrar `eas credentials` çalıştırın:
```bash
eas credentials
```

3. Seçimler:
   - Platform: **Android**
   - Profile: **production**
   - What do you want to do?: **"Push Notifications (FCM V1): Google Service Account Key"** seçin
   - (Eğer görünmüyorsa "Google Service Account" seçeneğini seçin)

4. Dosya yolu sorulduğunda:
   - `./alerta-b8df2-1217e3431c1b.json`
   - Veya tam yol: `/Users/ata/Desktop/alertachart/mobile/alerta-b8df2-1217e3431c1b.json`

5. Onaylayın

## Alternatif: Legacy API Key (Önerilmez)

Eğer Legacy API Key kullanmak istiyorsanız:

1. Firebase Console → Cloud Messaging sekmesinde
2. "Cloud Messaging API (Legacy)" bölümünü etkinleştirin
3. Sayfayı yenileyin
4. "Server key" görünecek (AIza... ile başlar)
5. Bu key'i EAS'a yapıştırın

**Ama V1 önerilir çünkü Legacy deprecated!**











