# ✅ Vercel Environment Variable Kontrol Listesi

## 🔍 Kontrol Etmen Gerekenler

### 1. DATABASE_URL Değeri

Vercel Dashboard → Settings → Environment Variables → `DATABASE_URL`

**❌ YANLIŞ (Internal - Vercel'den çalışmaz):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway
```

**✅ DOĞRU (Public - Vercel'den çalışır):**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

**Kontrol:** `postgres.railway.internal` içeriyorsa → ❌ YANLIŞ
**Kontrol:** `metro.proxy.rlwy.net` içeriyorsa → ✅ DOĞRU

---

### 2. Environment İşaretlemeleri

`DATABASE_URL` için şunlar işaretli olmalı:
- ✅ **Production**
- ✅ **Preview**  
- ✅ **Development**

**Kontrol:** Her üçü de işaretli mi?

---

### 3. Değişiklik Sonrası Redeploy

Environment variable değiştirdikten sonra:
1. ✅ **Redeploy yapıldı mı?**
2. ✅ **Yeni deployment başarılı mı?**
3. ✅ **Logs'da hata var mı?**

---

## 🔧 Adım Adım Düzeltme

### Adım 1: DATABASE_URL'i Kontrol Et
1. Vercel Dashboard → `alertachart` projesi
2. **Settings** → **Environment Variables**
3. `DATABASE_URL` değişkenini bul
4. **Value** kısmını kontrol et

**Eğer `postgres.railway.internal` görüyorsan:**
- ❌ Internal URL kullanılıyor
- ✅ Public URL'e değiştir

### Adım 2: Public URL'e Değiştir
1. `DATABASE_URL` → **Edit** butonuna tıkla
2. **Value** kısmını değiştir:

**Eski:**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@postgres.railway.internal:5432/railway
```

**Yeni:**
```
postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway
```

3. **Save** butonuna tıkla

### Adım 3: Environment'ları Kontrol Et
- ✅ Production işaretli mi?
- ✅ Preview işaretli mi?
- ✅ Development işaretli mi?

**Eğer değilse:** Her birini işaretle ve **Save** yap

### Adım 4: Redeploy Yap
1. **Deployments** sekmesine git
2. En son deployment'ın yanındaki **"..."** menüsüne tıkla
3. **"Redeploy"** seçeneğini seç
4. **"Use existing Build Cache"** işaretini kaldır (opsiyonel - daha temiz)
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

### 1. Deployment Logs Kontrolü
1. Vercel Dashboard → **Deployments** → En son deployment
2. **Logs** sekmesine git
3. Hata var mı kontrol et

**Beklenen:** `ENOTFOUND postgres.railway.internal` hatası kaybolmalı

### 2. API Test
Browser Console'da:
```javascript
fetch('/api/user/plan?t=' + Date.now())
  .then(r => r.json())
  .then(data => console.log('✅ API çalışıyor:', data))
  .catch(err => console.error('❌ API hatası:', err));
```

**Beklenen:** JSON response (hata yok)

### 3. Function Logs Kontrolü
1. Vercel Dashboard → **Deployments** → En son deployment
2. **Functions** sekmesine git
3. Bir API endpoint'ine tıkla (örn: `/api/user/plan`)
4. **Logs** sekmesine git
5. Database bağlantı hataları var mı kontrol et

---

## 🚨 Hala Çalışmıyorsa

### 1. Cache Temizle
- Vercel'de **"Use existing Build Cache"** işaretini kaldır
- Yeniden redeploy yap

### 2. Environment Variable'ı Sil ve Yeniden Ekle
1. `DATABASE_URL` → **Delete** butonuna tıkla
2. **Add New** → `DATABASE_URL` ekle
3. Public URL'i yapıştır
4. Environment'ları işaretle
5. Redeploy yap

### 3. Railway Public URL'i Doğrula
Railway Dashboard'dan public URL'i tekrar kontrol et:
- Variables → `DATABASE_PUBLIC_URL` veya `POSTGRES_URL`

---

## 📝 Özet Checklist

- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] `DATABASE_URL` değişkenini bul
- [ ] Value'da `postgres.railway.internal` var mı? → ❌ YANLIŞ
- [ ] Value'da `metro.proxy.rlwy.net` var mı? → ✅ DOĞRU
- [ ] Production, Preview, Development işaretli mi?
- [ ] Değişiklik yaptıysan → Redeploy yap
- [ ] Deployment başarılı mı?
- [ ] Logs'da hata var mı?
- [ ] API test et → Çalışıyor mu?

---

**Not**: Railway PostgreSQL çalışıyor (loglar gösteriyor). Sorun sadece Vercel'deki connection string'de!

