# Domain Migration: alerta.kriptokirmizi.com → alertachart.com

## ✅ Yapılan İşlemler

### 1. Kod Tarafı
- ✅ Tüm SEO dosyalarında domain `alertachart.com` olarak güncellendi
- ✅ Sitemap `alertachart.com` domain'ini kullanıyor
- ✅ Metadata, Open Graph, Structured Data güncellendi
- ✅ **Middleware eklendi:** Eski domain'den yeni domain'e 301 redirect yapılıyor

### 2. Redirect Yapılandırması
`middleware.ts` dosyası eklendi:
- Eski domain (`alerta.kriptokirmizi.com`) → Yeni domain (`alertachart.com`)
- **301 Permanent Redirect** kullanılıyor (SEO için önemli)
- Tüm route'lar için geçerli (API route'lar hariç)

## 🔧 Google Search Console'da Yapılması Gerekenler

### Adım 1: Eski Domain'i Google Search Console'dan Kaldırma

1. [Google Search Console](https://search.google.com/search-console) → Giriş yapın
2. Eski domain property'yi seçin: `alerta.kriptokirmizi.com`
3. **Settings** → **Removal** → **New Request**
4. **Temporary removal** seçin (veya **Permanent removal**)
5. Tüm URL'leri kaldırmak için: `alerta.kriptokirmizi.com/*` yazın
6. **Submit** butonuna tıklayın

### Adım 2: Yeni Domain'i Google Search Console'a Ekleme

1. [Google Search Console](https://search.google.com/search-console) → **Add Property**
2. **URL prefix** seçin
3. Domain: `https://alertachart.com`
4. DNS doğrulaması yapın (TXT kaydı ekleyin)
5. **Verify** butonuna tıklayın

### Adım 3: Sitemap Gönderme

1. Yeni domain property'de → **Sitemaps**
2. Sitemap URL'i girin: `https://alertachart.com/sitemap.xml`
3. **Submit** butonuna tıklayın

### Adım 4: Change of Address (Domain Değişikliği) Bildirimi

1. Yeni domain property'de → **Settings** → **Change of Address**
2. Eski domain'i seçin: `alerta.kriptokirmizi.com`
3. **Validate and Update** butonuna tıklayın
4. Bu işlem Google'a domain değişikliğini bildirir ve SEO değerini transfer eder

### Adım 5: Eski Domain'in Index'ini Kaldırma

1. Eski domain property'de → **Removals** → **New Request**
2. **Temporary removal** seçin
3. Pattern: `alerta.kriptokirmizi.com/*`
4. **Submit** butonuna tıklayın
5. Bu işlem eski domain'in Google index'inden kaldırılmasını hızlandırır

## 🌐 Vercel'de Domain Ayarları

### Eski Domain'i Vercel'e Ekleme (Redirect için)

1. Vercel Dashboard → Project Settings → **Domains**
2. **Add Domain** → `alerta.kriptokirmizi.com` ekleyin
3. DNS ayarlarını yapın (CNAME veya A record)
4. Vercel otomatik olarak yeni domain'e redirect yapacak (middleware ile birlikte çalışır)

**Not:** Eğer eski domain'i Vercel'e eklemezseniz, middleware sadece kod tarafında çalışır. Vercel'e eklemek daha güvenilir bir çözümdür.

## 📊 SEO Transfer Süreci

### Beklenen Süre
- **301 Redirect:** Hemen etkili olur
- **Google Index Güncellemesi:** 1-4 hafta
- **Eski Domain'in Index'ten Kaldırılması:** 2-8 hafta
- **SEO Değerinin Transferi:** 2-6 hafta

### İzleme
1. Google Search Console'da yeni domain'in index durumunu kontrol edin
2. Eski domain'in index'ten kaldırılma sürecini takip edin
3. Organic traffic'i karşılaştırın (eski vs yeni domain)

## 🔍 Kontrol Listesi

- [x] Kod tarafında domain güncellendi
- [x] Sitemap güncellendi
- [x] Metadata güncellendi
- [x] Middleware ile redirect eklendi
- [ ] Google Search Console'da eski domain kaldırıldı
- [ ] Google Search Console'da yeni domain eklendi
- [ ] Sitemap yeni domain'e gönderildi
- [ ] Change of Address bildirimi yapıldı
- [ ] Vercel'de eski domain eklendi (redirect için)
- [ ] DNS ayarları yapıldı

## ⚠️ Önemli Notlar

1. **301 Redirect:** SEO değerini korur, arama motorlarına domain değişikliğini bildirir
2. **Change of Address:** Google'a domain değişikliğini resmi olarak bildirir
3. **Eski Domain'i Kaldırma:** Eski domain'in index'ten kaldırılmasını hızlandırır
4. **Sitemap:** Yeni domain'in tüm sayfalarını Google'a bildirir

## 🚀 Hızlı Başlangıç

1. ✅ Middleware zaten eklendi (301 redirect aktif)
2. ⏳ Google Search Console'da eski domain'i kaldırın
3. ⏳ Google Search Console'da yeni domain'i ekleyin
4. ⏳ Sitemap'i gönderin
5. ⏳ Change of Address bildirimi yapın
6. ⏳ Vercel'de eski domain'i ekleyin (opsiyonel ama önerilir)

## 📝 Sonuç

Middleware ile eski domain'den yeni domain'e otomatik redirect yapılıyor. Google Search Console'da yapılacak işlemlerle eski domain'in index'ten kaldırılması ve SEO değerinin yeni domain'e transfer edilmesi sağlanacak.

