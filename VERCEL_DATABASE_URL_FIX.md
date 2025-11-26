# 🔧 Vercel DATABASE_URL Düzeltme Rehberi

## ❌ Sorun

**Hata:**
```
Error: getaddrinfo ENOTFOUND postgres.railway.internal
```

**Neden:** Vercel'de `postgres.railway.internal` (internal URL) kullanılıyor ama bu sadece Railway network'ünden erişilebilir. Vercel'den erişilemez!

---

## ✅ Çözüm: Public URL Kullan

### Railway Connection String'leri

**❌ Internal URL (Sadece Railway'den çalışır):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway
```

**✅ Public URL (Vercel'den çalışır):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

---

## 📋 Vercel'de DATABASE_URL Güncelleme

### Adım 1: Vercel Dashboard'a Git
1. [Vercel Dashboard](https://vercel.com/dashboard) → Giriş yap
2. `alertachart` projesini seç

### Adım 2: Environment Variables'a Git
1. **Settings** sekmesine tıkla
2. **Environment Variables** sekmesine tıkla

### Adım 3: DATABASE_URL'i Güncelle
1. `DATABASE_URL` değişkenini bul
2. **Edit** butonuna tıkla
3. **Value** kısmını güncelle:

**Eski (Internal - Çalışmıyor):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway
```

**Yeni (Public - Çalışır):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

### Adım 4: Environment'ları İşaretle
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### Adım 5: Redeploy
1. **Deployments** sekmesine git
2. En son deployment'ın yanındaki **"..."** menüsüne tıkla
3. **"Redeploy"** seçeneğini seç
4. **"Use existing Build Cache"** işaretini kaldır (opsiyonel)
5. **"Redeploy"** butonuna tıkla

**Veya:**
- Git'e yeni bir commit push yap
- Vercel otomatik olarak redeploy edecek

---

## 🔍 Railway'den Public URL Alma

Eğer public URL'i bilmiyorsan:

1. [Railway Dashboard](https://railway.app) → Giriş yap
2. Projeni seç → **Postgres** service'ine tıkla
3. **Variables** sekmesine git
4. `DATABASE_PUBLIC_URL` veya `POSTGRES_URL` değişkenini bul
5. Connection string'i kopyala

**Format:**
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

**Örnek:**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

---

## ✅ Kontrol

Redeploy sonrası:

1. Vercel Dashboard → **Deployments** → En son deployment
2. **Functions** sekmesine git
3. Bir API endpoint'ine tıkla (örn: `/api/user/plan`)
4. **Logs** sekmesine git
5. Hata yoksa ✅ Başarılı!

**Veya Browser Console'da test et:**
```javascript
fetch('/api/user/plan?t=' + Date.now())
  .then(r => r.json())
  .then(data => console.log('✅ API çalışıyor:', data));
```

---

## 🚨 Önemli Notlar

### Internal vs Public URL

| URL Tipi | Nereden Erişilebilir | Kullanım |
|----------|---------------------|---------|
| **Internal** (`postgres.railway.internal`) | Sadece Railway network'ünden | Backend (Railway'de) |
| **Public** (`metro.proxy.rlwy.net`) | Her yerden | Frontend (Vercel'den) |

### Güvenlik

- ✅ Public URL SSL ile korumalı (`sslmode=require`)
- ✅ Password güvenli
- ✅ Railway firewall koruması var

---

## 📝 Özet

1. ✅ Vercel Dashboard → Settings → Environment Variables
2. ✅ `DATABASE_URL` → Edit
3. ✅ Internal URL → Public URL'e değiştir
4. ✅ Production, Preview, Development işaretle
5. ✅ Redeploy yap
6. ✅ Test et

**Tahmini Süre**: 2-3 dakika

---

## 🎯 Beklenen Sonuç

Redeploy sonrası:
- ✅ Database bağlantısı çalışacak
- ✅ API endpoint'leri çalışacak
- ✅ Premium özellikler açılacak
- ✅ Session restore çalışacak

**Hata mesajı kaybolacak!** 🎉

