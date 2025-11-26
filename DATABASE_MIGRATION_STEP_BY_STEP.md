# 📦 Adım 2: Database Migration - Adım Adım Rehber

## 🎯 İki Yöntem Var

### Yöntem 1: Railway Dashboard'dan SQL Çalıştırma (EN KOLAY) ⭐ ÖNERİLEN
### Yöntem 2: pg_dump ile Tam Backup (Veri varsa)

---

## 🚀 Yöntem 1: Railway Dashboard'dan SQL Çalıştırma

### Adım 1: Railway Dashboard'a Git
1. [Railway Dashboard](https://railway.app) → Giriş yap
2. Projeni seç
3. **Postgres** service'ine tıkla

### Adım 2: Query Sekmesine Git
1. Üst menüden **"Database"** sekmesine tıkla
2. **"Query"** sekmesine tıkla (Data, Extensions, Credentials yanında)

### Adım 3: Schema Dosyalarını Sırayla Çalıştır

Aşağıdaki SQL dosyalarını sırayla kopyala-yapıştır ve çalıştır:

#### 1️⃣ Auth Schema (İlk önce bu!)
```sql
-- database/auth-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/auth-schema.sql` içeriğini kopyala-yapıştır

#### 2️⃣ Push Schema
```sql
-- database/push-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/push-schema.sql` içeriğini kopyala-yapıştır

#### 3️⃣ Premium Schema
```sql
-- database/premium-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/premium-schema.sql` içeriğini kopyala-yapıştır

#### 4️⃣ Blog Schema
```sql
-- database/blog-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/blog-schema.sql` içeriğini kopyala-yapıştır

#### 5️⃣ News Schema
```sql
-- database/news-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/news-schema.sql` içeriğini kopyala-yapıştır

#### 6️⃣ Notifications Schema
```sql
-- database/notifications-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/notifications-schema.sql` içeriğini kopyala-yapıştır

#### 7️⃣ Support Schema
```sql
-- database/support-schema.sql içeriğini buraya yapıştır
```
**Dosya**: `database/support-schema.sql` içeriğini kopyala-yapıştır

### Adım 4: Her SQL'i Çalıştır
1. SQL'i Query editörüne yapıştır
2. **"Run"** veya **"Execute"** butonuna tıkla
3. ✅ Başarılı mesajını bekle
4. Sonraki SQL'e geç

---

## 💾 Yöntem 2: pg_dump ile Tam Backup (Veri Varsa)

Eğer Neon'da veri varsa ve taşımak istiyorsan:

### Adım 1: Neon'dan Backup Al

**Terminal'de çalıştır:**
```bash
# Neon connection string'ini kullan
pg_dump "postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" > neon_backup.sql
```

**Neon connection string'ini nereden bulacaksın:**
- Neon Dashboard → Project → Connection Details → Connection string

### Adım 2: Railway'e Import Et

**Terminal'de çalıştır:**
```bash
# Railway connection string'ini kullan
psql "postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem0metro.proxy.rlwy.net:22557/railway" < neon_backup.sql
```

**Railway connection string'ini nereden bulacaksın:**
- Railway Dashboard → Postgres → Variables → `DATABASE_PUBLIC_URL`

---

## 🎯 Hızlı Yol: Tek Komutla Tüm Schema'ları Çalıştır

Eğer terminal kullanmak istiyorsan:

### Adım 1: Tüm Schema Dosyalarını Birleştir

**Terminal'de çalıştır:**
```bash
cd /Users/ata/Desktop/alertachart

# Tüm schema dosyalarını birleştir
cat database/auth-schema.sql \
    database/push-schema.sql \
    database/premium-schema.sql \
    database/blog-schema.sql \
    database/news-schema.sql \
    database/notifications-schema.sql \
    database/support-schema.sql > all_schemas.sql
```

### Adım 2: Railway'e Import Et

**Railway Public URL kullan:**
```bash
psql "postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem0metro.proxy.rlwy.net:22557/railway" < all_schemas.sql
```

**Veya Railway Internal URL (sadece Railway'den):**
```bash
# Railway'de bir service içinde çalıştır
psql "postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem0met@postgres.railway.internal:5432/railway" < all_schemas.sql
```

---

## ✅ Migration Sonrası Kontrol

### Railway Dashboard'dan Kontrol Et

1. Railway Dashboard → Postgres → Database → **"Data"** sekmesi
2. Tabloları kontrol et:
   - ✅ `users` tablosu var mı?
   - ✅ `devices` tablosu var mı?
   - ✅ `price_alerts` tablosu var mı?
   - ✅ `blog_posts` tablosu var mı?
   - ✅ `news_articles` tablosu var mı?
   - ✅ `support_requests` tablosu var mı?

### SQL ile Kontrol Et

Railway Query sekmesinde:
```sql
-- Tüm tabloları listele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Users tablosunu kontrol et
SELECT COUNT(*) FROM users;

-- Devices tablosunu kontrol et
SELECT COUNT(*) FROM devices;
```

---

## 🚨 Sorun Giderme

### Hata: "relation already exists"
**Çözüm**: `IF NOT EXISTS` kullanıldığı için sorun olmamalı. Eğer olursa:
```sql
-- Tabloyu sil ve tekrar oluştur (DİKKAT: Veri kaybı olur!)
DROP TABLE IF EXISTS users CASCADE;
-- Sonra schema'yı tekrar çalıştır
```

### Hata: "permission denied"
**Çözüm**: Railway'de `postgres` user'ı admin, sorun olmamalı. Eğer olursa:
- Railway Dashboard → Postgres → Settings → Permissions kontrol et

### Hata: "connection refused"
**Çözüm**: 
- Railway Public URL kullan (internal URL local'den çalışmaz)
- Connection string'deki password'u kontrol et
- Railway service'inin çalıştığından emin ol

---

## 📋 Checklist

- [ ] Railway Dashboard'a giriş yapıldı
- [ ] Postgres service seçildi
- [ ] Database → Query sekmesine gidildi
- [ ] auth-schema.sql çalıştırıldı ✅
- [ ] push-schema.sql çalıştırıldı ✅
- [ ] premium-schema.sql çalıştırıldı ✅
- [ ] blog-schema.sql çalıştırıldı ✅
- [ ] news-schema.sql çalıştırıldı ✅
- [ ] notifications-schema.sql çalıştırıldı ✅
- [ ] support-schema.sql çalıştırıldı ✅
- [ ] Tablolar kontrol edildi (Data sekmesinden)
- [ ] Migration başarılı! 🎉

---

## 🎯 En Kolay Yol (Önerilen)

1. **Railway Dashboard** → Postgres → Database → **Query**
2. Her schema dosyasını sırayla kopyala-yapıştır
3. **Run** butonuna tıkla
4. ✅ Başarılı mesajını gör
5. Sonraki schema'ya geç

**Toplam Süre**: 5-10 dakika

---

## 💡 İpucu

Eğer Neon'da veri yoksa (yeni kurulum), sadece schema dosyalarını çalıştırman yeterli!

Eğer Neon'da veri varsa, önce pg_dump ile backup al, sonra Railway'e import et.

