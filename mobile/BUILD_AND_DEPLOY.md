# 🚀 Google Play Store Build & Deploy Rehberi

## ✅ Tamamlanan Hazırlıklar

- ✅ EAS projesi oluşturuldu
- ✅ app.json production için güncellendi
- ✅ WebView URL'leri production'a çevrildi
- ✅ Backend API URL'leri ayarlandı
- ✅ Version bilgileri eklendi (1.0.0, versionCode: 1)
- ✅ Android permissions yapılandırıldı

## 📱 Adım 1: Android Production Build

### Build Başlatma

```bash
cd /Users/ata/Desktop/alertachart/mobile

# Production build başlat
eas build --platform android --profile production
```

### Build Süreci

1. **EAS Build başlayacak**
   - Kod cloud'a yüklenecek
   - Dependencies kurulacak
   - Android AAB dosyası oluşturulacak
   - Otomatik signing yapılacak

2. **Bekleme süresi**: ~10-20 dakika

3. **Build tamamlandığında**:
   - Dashboard'da link görünecek
   - AAB dosyasını indirebilirsiniz

### Build'i İndirme

```bash
# Son build'i listele
eas build:list --platform android

# Build'i indir
eas build:download --platform android
```

## 🎨 Adım 2: Store Görselleri Hazırlama

### Gerekli Görseller

#### 1. App Icon (Zaten Var ✅)
- **Konum**: `assets/icon.png`
- **Boyut**: 512x512 px
- Google Play Console'a yüklenecek

#### 2. Feature Graphic (Oluşturulacak)
- **Boyut**: 1024x500 px
- **İçerik**: Uygulama logosu + "Kripto Fiyat Takibi" yazısı
- **Renk**: Siyah arkaplan, altın/mavi yazı

**Hızlı oluşturma (Canva veya Figma ile)**:
```
1. 1024x500 px tuval oluştur
2. Siyah (#000000) arkaplan
3. App icon'u ortaya koy (256x256 px)
4. "Alerta" yazısı üstte (72pt, bold)
5. "Kripto Fiyat Takibi ve Bildirimler" alt yazı (36pt)
6. PNG olarak export et
```

#### 3. Screenshots (En az 2 adet)

**Önerilen ekran görüntüleri**:
1. Ana ekran (coin listesi)
2. Grafik ekranı (alarm kurulmuş)
3. Alarm listesi
4. Push notification örneği (mockup)

**Nasıl çekilir**:
```bash
# Expo development app'te çalıştır
cd /Users/ata/Desktop/alertachart/mobile
npx expo start

# QR kod ile aç
# Screenshots çek (Power + Volume Down)
# Veya Android Studio emulator kullan
```

**Screenshot boyutları**:
- **Phone**: 1080x1920 px (dikey)
- **Tablet** (opsiyonel): 1920x1080 px (yatay)

## 📝 Adım 3: Google Play Console Setup

### 3.1 Developer Account Oluşturma

1. **Git**: https://play.google.com/console
2. **Ücret**: $25 (tek seferlik, kredi kartı)
3. **Bilgiler**: Ad, adres, email
4. **Onay**: ~1-2 gün

### 3.2 Yeni Uygulama Oluşturma

1. **"Uygulama oluştur"** butonuna tıkla
2. **Dil**: Türkçe (varsayılan)
3. **Uygulama adı**: "Alerta - Kripto Fiyat Takibi"
4. **Kategori**: Finance (Finans)
5. **Ücretsiz/Ücretli**: Ücretsiz
6. **Oluştur** butonuna tıkla

### 3.3 Store Listing Doldurma

#### Uygulama Detayları
```
Uygulama adı: Alerta - Kripto Fiyat Takibi
Kısa açıklama: Kripto para fiyat takibi ve anlık bildirimler
Tam açıklama: [GOOGLE_PLAY_LISTING.md dosyasından kopyala]
```

#### Grafik Varlıkları
- App icon (512x512): `assets/icon.png`
- Feature graphic (1024x500): [Oluşturulacak]
- Phone screenshots: [Çekilecek - en az 2]
- Tablet screenshots: [Opsiyonel]

#### Kategori & İletişim
```
Uygulama kategorisi: Finans
E-posta: support@kriptokirmizi.com
Website: https://alerta.kriptokirmizi.com
Telefon: [Opsiyonel]
```

### 3.4 İçerik Derecelendirmesi

1. **"İçerik derecelendirmesi"** bölümüne git
2. **Anket doldur**:
   - Şiddet içeriği: Hayır
   - Cinsel içerik: Hayır
   - Kullanıcı etkileşimi: Hayır
   - Veri paylaşımı: Hayır
3. **Sonuç**: Everyone (Herkes)

### 3.5 Hedef Kitle ve İçerik

```
Hedef yaş grubu: 18+
```

### 3.6 Veri Güvenliği

1. **"Veri güvenliği"** bölümüne git
2. **Sorular**:
   - Veri toplama: Hayır (anonim cihaz ID hariç)
   - Veri paylaşımı: Hayır
   - Şifreleme: Evet (HTTPS)
3. **Privacy Policy**: https://alerta.kriptokirmizi.com/privacy

## 📦 Adım 4: AAB Dosyasını Yükleme

### 4.1 Üretim Sürümü Oluşturma

1. **Sol menüden**: "Yayın" > "Üretim"
2. **"Yeni sürüm oluştur"** butonuna tıkla
3. **AAB dosyasını yükle**: EAS Build'den indirdiğiniz `.aab` dosyasını sürükle-bırak

### 4.2 Sürüm Notları

```
TR:
İlk sürüm! 🎉

Özellikler:
• Canlı kripto para fiyatları
• Özel fiyat alarmları
• Otomatik push bildirimleri
• Profesyonel grafikler
• Birden fazla borsa desteği

EN:
First release! 🎉

Features:
• Live cryptocurrency prices
• Custom price alerts
• Automatic push notifications
• Professional charts
• Multiple exchange support
```

### 4.3 Ülkeler ve Bölgeler

- **Tüm ülkeler**: Evet (önerilir)
- Veya manuel seçim yapabilirsiniz

## ✅ Adım 5: İncelemeye Gönderme

### Kontrol Listesi

- [ ] Store listing tamamlandı (100%)
- [ ] İçerik derecelendirmesi yapıldı
- [ ] Hedef kitle belirlendi
- [ ] Veri güvenliği formu dolduruldu
- [ ] Privacy policy yayınlandı
- [ ] AAB dosyası yüklendi
- [ ] Sürüm notları eklendi
- [ ] Ülkeler/bölgeler seçildi
- [ ] Fiyatlandırma ayarlandı (Ücretsiz)

### Gönderme

1. **"İncelemeye gönder"** butonuna tıklayın
2. **Onay**: "Evet, gönder"
3. **Bekleme**: 1-7 gün (genellikle 1-3 gün)

### İnceleme Sürecinde

- **Durum**: "İncelemede" yazacak
- **Bildirimler**: Email ile güncellemeler gelecek
- **Redler**: Nedeni açıklanır, düzeltip tekrar gönderebilirsiniz

## 🎉 Adım 6: Yayınlandıktan Sonra

### İlk 24 Saat

- [ ] Google Play'de arayarak test edin
- [ ] Farklı cihazlarda test edin
- [ ] İlk yorumları takip edin
- [ ] Crash raporlarını kontrol edin

### Devam Eden

- [ ] Kullanıcı yorumlarını yanıtlayın
- [ ] Hata raporlarını takip edin
- [ ] Güncellemeler planlayın
- [ ] Rating'i iyileştirin

## 🔄 Güncelleme Yayınlama

### Version Artırma

```json
// app.json
{
  "version": "1.0.1",  // Her güncelleme
  "android": {
    "versionCode": 2   // Her güncelleme (otomatik artabilir)
  }
}
```

### Yeni Build

```bash
cd /Users/ata/Desktop/alertachart/mobile

# Version'ı güncelle (app.json)
# Sonra build al
eas build --platform android --profile production

# Yeni AAB'yi Google Play'e yükle
```

## 📊 Önemli Metrikler

### İzlenecekler

- **İndirmeler**: İlk hafta hedef 100+
- **Aktif kullanıcılar**: DAU/MAU
- **Rating**: 4.0+ hedef
- **Crash rate**: %1'in altında
- **Yorum response time**: 24 saat

## 🆘 Sorun Giderme

### Build Hatası
```bash
# Cache temizle
npm cache clean --force
cd /Users/ata/Desktop/alertachart/mobile
rm -rf node_modules
npm install --legacy-peer-deps

# Tekrar dene
eas build --platform android --profile production
```

### Red Alma (İnceleme)
1. Red nedenini oku
2. Gerekli düzeltmeleri yap
3. Version code artır
4. Yeni build al ve tekrar yükle

### Crash Raporları
- Google Play Console > "Kalite" bölümünden incele
- Stack trace'e bakarak düzelt
- Güncelleme yayınla

## 📱 Test Öncesi (Internal Test)

Canlıya almadan önce test etmek isterseniz:

```bash
# Internal test track oluştur
# Google Play Console > Test > İç test
# Test kullanıcıları ekle (email ile)
# AAB'yi internal track'e yükle
# Test kullanıcıları linkten indirebilir
```

---

## 🚀 HIZLI BAŞLANGIÇ KOMUTU

```bash
cd /Users/ata/Desktop/alertachart/mobile

# Production build başlat (en önemli adım!)
eas build --platform android --profile production

# Build tamamlandıktan sonra
eas build:download --platform android

# AAB dosyası indirilecek, Google Play Console'a yükleyin!
```

**Toplam süre**: 2-3 saat (hazırlık) + 1-7 gün (Google onayı)

**İyi şanslar! 🎉**


