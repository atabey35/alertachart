# 🔍 Google SEO Checklist - Alerta Chart

## ✅ Yapılan Güncellemeler (28 Kasım 2025)

### 1. Icon Dosyaları
- ✅ `app/icon.png` → `public/icon.png` kopyalandı
- ✅ Icon boyutu: 1024x1024 (Google için yeterli)
- ✅ Tüm icon referansları `/icon.png` olarak güncellendi

### 2. Metadata (app/layout.tsx)
- ✅ Title: "Alerta Chart - Professional Crypto Charting Platform"
- ✅ Description: TradingView PRO features FREE vurgusu
- ✅ Keywords: 150+ keyword eklendi
- ✅ Open Graph: Logo ve açıklama eklendi
- ✅ Twitter Card: Large image card
- ✅ Structured Data (JSON-LD): WebApplication schema
- ✅ Robots: Index ve follow aktif
- ✅ Canonical URL: `/` olarak ayarlandı

### 3. Sitemap (app/sitemap.ts)
- ✅ Ana sayfa: Priority 1.0, changeFrequency: always
- ✅ Privacy sayfaları: TR ve EN
- ✅ Blog, News, Help sayfaları eklendi
- ✅ Data ve Aggr platformları eklendi
- ✅ Settings, Account, Login sayfaları eklendi

### 4. Robots.txt (public/robots.txt)
- ✅ Tüm crawler'lara izin verildi
- ✅ Googlebot için özel kurallar
- ✅ Sitemap URL'i eklendi
- ✅ API ve admin route'ları disallow edildi

### 5. Manifest.json (public/manifest.json)
- ✅ PWA manifest oluşturuldu
- ✅ Icon referansları eklendi
- ✅ Theme colors ayarlandı
- ✅ Display mode: standalone

---

## ⚠️ Yapılması Gerekenler

### 1. Google Search Console
- [ ] Google Search Console'a site ekle
- [ ] Sitemap'i Google'a gönder: `https://alertachart.com/sitemap.xml`
- [ ] Google verification code'u al ve `app/layout.tsx`'e ekle:
  ```typescript
  verification: {
    google: 'YOUR_VERIFICATION_CODE_HERE',
  },
  ```
- [ ] URL Inspection ile ana sayfayı test et
- [ ] "Request Indexing" yap

### 2. Google Indexing Hızlandırma
- [ ] Google Search Console → Sitemaps → `https://alertachart.com/sitemap.xml` ekle
- [ ] Ana sayfa için "Request Indexing" yap
- [ ] Privacy, Blog, News sayfaları için "Request Indexing" yap
- [ ] Google'ın index alması 1-7 gün sürebilir

### 3. Open Graph Image Optimizasyonu (Opsiyonel)
- [ ] 1200x630 boyutunda özel Open Graph image oluştur
- [ ] Image'e logo, başlık ve açıklama ekle
- [ ] `public/og-image.png` olarak kaydet
- [ ] `app/layout.tsx`'de Open Graph image URL'ini güncelle

### 4. Content Güncellemeleri
- [ ] Ana sayfada "Alerta Chart" brand name'inin geçtiğinden emin ol
- [ ] Meta description'da "TradingView alternative" vurgusu
- [ ] H1 tag'inde "Alerta Chart" geçmeli
- [ ] Alt text'lerde "Alerta Chart" geçmeli

### 5. Backlinks ve Social Signals
- [ ] Social media paylaşımları (Twitter, LinkedIn, Reddit)
- [ ] Backlink stratejisi (crypto forums, trading communities)
- [ ] Press release (opsiyonel)

---

## 🔍 Google'da Görünürlük Kontrolü

### Test Komutları:
```bash
# Google'da site kontrolü
site:alertachart.com

# Ana sayfa kontrolü
site:alertachart.com "Alerta Chart"

# Logo görünürlüğü
site:alertachart.com filetype:png
```

### Beklenen Sonuçlar:
1. ✅ Ana sayfa ilk sırada görünmeli
2. ✅ Logo (icon.png) görünmeli
3. ✅ Meta description görünmeli
4. ✅ Site links (Privacy, Blog, etc.) görünmeli

---

## 📊 Index Durumu Kontrolü

### Google Search Console'da Kontrol Edilecekler:
1. **Coverage Report:**
   - Index edilen sayfalar
   - Hata veren sayfalar
   - Uyarılar

2. **Performance Report:**
   - Impressions (görünme sayısı)
   - Clicks (tıklama sayısı)
   - CTR (click-through rate)
   - Average position

3. **Sitemap Status:**
   - Sitemap'in başarıyla işlendiğini kontrol et
   - Index edilen URL sayısı

---

## 🚀 Hızlandırma İpuçları

### 1. Immediate Actions (Bugün):
- [ ] Google Search Console'a site ekle
- [ ] Sitemap'i gönder
- [ ] Ana sayfa için "Request Indexing" yap

### 2. Short-term (Bu Hafta):
- [ ] Social media paylaşımları
- [ ] Backlink stratejisi başlat
- [ ] Content güncellemeleri

### 3. Long-term (Bu Ay):
- [ ] Regular content updates (blog posts)
- [ ] SEO optimizasyonu (keyword research)
- [ ] Performance monitoring

---

## 📝 Notlar

- **Index Süresi:** Google'ın index alması genellikle 1-7 gün sürer
- **Logo Görünürlüğü:** Icon dosyası doğru yerde (`public/icon.png`) ve metadata'da referans edilmiş
- **Sitemap:** Tüm önemli sayfalar sitemap'te
- **Metadata:** Tüm gerekli metadata'lar eklendi

---

## ✅ Son Kontrol Listesi

- [x] `public/icon.png` dosyası var
- [x] `app/layout.tsx` metadata güncel
- [x] `app/sitemap.ts` tüm sayfaları içeriyor
- [x] `public/robots.txt` doğru yapılandırılmış
- [x] `public/manifest.json` oluşturuldu
- [ ] Google Search Console'a site eklendi
- [ ] Sitemap Google'a gönderildi
- [ ] "Request Indexing" yapıldı

---

**Son Güncelleme:** 28 Kasım 2025
**Durum:** Teknik SEO hazır, Google indexing bekleniyor

