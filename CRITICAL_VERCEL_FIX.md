# 🚨 KRİTİK: Vercel DATABASE_URL Düzeltme

## ❌ Sorun

**Hata:**
```
Error: getaddrinfo ENOTFOUND postgres.railway.internal
```

**Neden:** Vercel'de `DATABASE_URL` hala **internal URL** içeriyor!

---

## ✅ ÇÖZÜM: DATABASE_URL Değerini Kontrol Et

### Adım 1: Vercel Dashboard'da Kontrol Et

1. [Vercel Dashboard](https://vercel.com/dashboard) → `alertachart` projesi
2. **Settings** → **Environment Variables**
3. `DATABASE_URL` değişkenini bul
4. **Value** kısmına bak

### Adım 2: Değeri Kontrol Et

**❌ EĞER ŞUNU GÖRÜYORSAN (YANLIŞ):**
```
postgresql://postgres:...@postgres.railway.internal:5432/railway
```
→ **Internal URL** - Vercel'den çalışmaz!

**✅ ŞUNU GÖRMELİSİN (DOĞRU):**
```
postgresql://postgres:...@metro.proxy.rlwy.net:22557/railway
```
→ **Public URL** - Vercel'den çalışır!

---

## 🔧 Düzeltme

### Eğer Internal URL Görüyorsan:

1. `DATABASE_URL` → **Edit** butonuna tıkla
2. **Value** kısmını değiştir:

**Eski (Yanlış):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway
```

**Yeni (Doğru):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

3. **Save** butonuna tıkla
4. **Redeploy** yap (Deployments → En son deployment → "..." → Redeploy)

---

## 🔍 Railway'den Public URL Alma

Eğer public URL'i bilmiyorsan:

1. [Railway Dashboard](https://railway.app) → Projeni seç
2. **Postgres** service'ine tıkla
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
2. **Logs** sekmesine git
3. `ENOTFOUND postgres.railway.internal` hatası kaybolmalı ✅

**Veya Browser Console'da test et:**
```javascript
fetch('/api/user/plan?t=' + Date.now())
  .then(r => r.json())
  .then(data => console.log('✅ API çalışıyor:', data))
  .catch(err => console.error('❌ Hata:', err));
```

---

## 📝 Özet

**Sorun:** Vercel'de `DATABASE_URL` internal URL içeriyor
**Çözüm:** Public URL'e değiştir ve redeploy yap

**Kontrol:** `postgres.railway.internal` → ❌ YANLIŞ
**Kontrol:** `metro.proxy.rlwy.net` → ✅ DOĞRU

---

**Not**: Railway PostgreSQL çalışıyor (loglar gösteriyor). Sorun sadece Vercel'deki connection string'de!

