# Google Play App Signing SHA-1'i Bulma (Setup Menüsü Yoksa)

## 🔍 Yöntem 1: Doğrudan URL

Tarayıcıda şu URL'yi açın:

```
https://play.google.com/console/u/0/developers/{PROJECT_ID}/app/{APP_ID}/app-signing
```

`{PROJECT_ID}` ve `{APP_ID}` yerine Google Play Console'daki proje ve uygulama ID'lerinizi yazın.

**Veya daha basit:**

1. Google Play Console ana sayfasına gidin
2. URL'deki sayıları kopyalayın
3. Şu formatta URL oluşturun:
```
https://play.google.com/console/u/0/developers/[SAYI]/app/[SAYI]/app-signing
```

## 🔍 Yöntem 2: Menüden Bulma (Alternatif İsimler)

Google Play Console'un yeni arayüzünde menü isimleri değişmiş olabilir:

### Türkçe menü:
- **Kurulum** (Setup yerine)
- **Ayarlar** (Settings)
- **Uygulama bütünlüğü** (App integrity) - Bu sayfada App signing olabilir
- **Gelişmiş ayarlar** (Advanced settings)

### İngilizce menü:
- **Setup** → **App signing**
- **Settings** → **App signing**
- **App integrity** → **App signing**

## 🔍 Yöntem 3: Arama ile

1. Google Play Console'da üstteki **arama çubuğuna** tıklayın
2. "App signing" veya "SHA-1" yazın
3. Sonuçlardan **App signing** sayfasını seçin

## 🔍 Yöntem 4: App Integrity Sayfasından

1. Sol menüde **"Uygulama bütünlüğü"** (App integrity) veya **"Gelişmiş ayarlar"** (Advanced settings) seçin
2. Bu sayfada **App signing** bölümü olabilir
3. Veya **"App signing key certificate"** linkine tıklayın

## 📍 App Signing Sayfasında

App signing sayfasına ulaştığınızda:

1. **App signing key certificate** bölümünü bulun
2. **SHA-1 certificate fingerprint** değerini kopyalayın
3. Bu SHA-1'i Firebase'e ekleyin

## 🔧 Hızlı Test

Eğer hala bulamıyorsanız:

1. Google Play Console ana sayfasına gidin
2. Tarayıcı URL'sini kopyalayın
3. URL'deki sayıları not edin
4. Şu formatta deneyin:
   - `https://play.google.com/console/u/0/developers/[SAYI]/app/[SAYI]/app-signing`
   - `https://play.google.com/console/u/0/developers/[SAYI]/app/[SAYI]/setup/app-signing`

## 💡 Alternatif: Google Play Console Email'den

Eğer Google Play Console'dan email aldıysanız:
- Email'de App signing ile ilgili linkler olabilir
- Bu linkler doğrudan App signing sayfasına götürür

## 🆘 Hala Bulamıyorsanız

1. Google Play Console ana sayfasına gidin
2. Tarayıcı URL'sini paylaşın (sayıları gizleyebilirsiniz)
3. Menü yapısını ekran görüntüsü ile paylaşın
4. Birlikte bulalım!

