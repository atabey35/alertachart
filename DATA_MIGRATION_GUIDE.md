# 📦 Neon'dan Railway'e Veri Migration Rehberi

## 🎯 Özet

Neon database'indeki **tüm verileri** Railway PostgreSQL'e aktarmak için adım adım rehber.

---

## 📋 Adım 1: Neon Connection String'i Al

1. [Neon Console](https://console.neon.tech) → Giriş yap
2. Projeni seç
3. **Connection Details** sekmesine git
4. **Connection string**'i kopyala

**Format:**
```
postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 📋 Adım 2: Railway Connection String'i Al

1. [Railway Dashboard](https://railway.app) → Giriş yap
2. Projeni seç → **Postgres** service'ine tıkla
3. **Variables** sekmesine git
4. `DATABASE_PUBLIC_URL` veya `DATABASE_URL` değişkenini kopyala

**Format:**
```
postgresql://postgres:password@metro.proxy.rlwy.net:22557/railway
```

---

## 📋 Adım 3: Migration Script'ini Çalıştır

### Yöntem 1: Otomatik Script (Önerilen) ⭐

**Terminal'de çalıştır:**
```bash
cd /Users/ata/Desktop/alertachart

# Neon ve Railway connection string'lerini set et
export NEON_DB_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
export RAILWAY_DB_URL="postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway"

# Migration script'ini çalıştır
node scripts/migrate-data-from-neon.cjs
```

**Script ne yapar:**
1. ✅ Neon'a bağlanır
2. ✅ Tüm tabloları kontrol eder
3. ✅ Her tablodaki verileri okur
4. ✅ Railway'e aktarır (batch insert)
5. ✅ Duplicate kontrolü yapar (ON CONFLICT DO NOTHING)
6. ✅ Verification yapar (row count karşılaştırması)

---

### Yöntem 2: pg_dump ile Manuel Migration

**Adım 1: Neon'dan Dump Al**
```bash
# Neon connection string ile dump al
pg_dump "postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" > neon_data_dump.sql
```

**Adım 2: Railway'e Import Et**
```bash
# Railway connection string ile import et
psql "postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway" < neon_data_dump.sql
```

**Not**: Eğer `psql` kurulu değilse, Railway Dashboard'dan Query sekmesini kullan.

---

## 📋 Adım 4: Verification

### Railway Dashboard'dan Kontrol

1. Railway Dashboard → Postgres → Database → **Data** sekmesi
2. Her tabloyu kontrol et:
   - `users` - Kullanıcı sayısı doğru mu?
   - `devices` - Device sayısı doğru mu?
   - `price_alerts` - Alert sayısı doğru mu?
   - `blog_posts` - Blog yazıları var mı?
   - `news` - Haberler var mı?

### SQL ile Kontrol

Railway Query sekmesinde:
```sql
-- Users sayısı
SELECT COUNT(*) FROM users;

-- Devices sayısı
SELECT COUNT(*) FROM devices;

-- Price alerts sayısı
SELECT COUNT(*) FROM price_alerts;

-- Blog posts sayısı
SELECT COUNT(*) FROM blog_posts;

-- News sayısı
SELECT COUNT(*) FROM news;
```

---

## 🔄 Migration Sırası (Foreign Key Dependencies)

Script otomatik olarak doğru sırayı takip eder:

1. **users** (ilk - bağımlılık yok)
2. **user_sessions** (users'a bağlı)
3. **devices** (users'a bağlı)
4. **price_alerts** (devices'a bağlı)
5. **alarm_subscriptions** (devices'a bağlı)
6. **alarms** (users'a bağlı)
7. **trial_attempts** (users'a bağlı)
8. **blog_posts** (bağımsız)
9. **news** (bağımsız)
10. **notifications** (bağımsız)
11. **support_requests** (users'a bağlı - optional)

---

## ⚠️ Önemli Notlar

### 1. Duplicate Prevention
- Script `ON CONFLICT DO NOTHING` kullanır
- Aynı veriyi tekrar migrate edersen duplicate oluşmaz
- Güvenli bir şekilde birden fazla kez çalıştırılabilir

### 2. Foreign Key Constraints
- Script foreign key sırasına göre migrate eder
- Eğer bir tablo başarısız olursa, sonraki tablolar etkilenmez
- Her tablo bağımsız olarak migrate edilir

### 3. Data Types
- Tüm data types uyumlu (VARCHAR, INTEGER, TIMESTAMP, vb.)
- Decimal precision korunur
- Boolean değerler korunur

### 4. Timestamps
- `created_at`, `updated_at` değerleri korunur
- Neon'daki timestamp'ler aynen aktarılır

---

## 🚨 Sorun Giderme

### Hata: "relation does not exist"
**Çözüm**: Tablo Neon'da yok, normal. Script otomatik olarak skip eder.

### Hata: "duplicate key value"
**Çözüm**: Veri zaten var. `ON CONFLICT DO NOTHING` sayesinde sorun olmaz.

### Hata: "foreign key constraint"
**Çözüm**: Migration sırası yanlış. Script otomatik olarak doğru sırayı takip eder.

### Hata: "connection timeout"
**Çözüm**: 
- Connection string'leri kontrol et
- Railway Public URL kullan (internal URL local'den çalışmaz)
- Network bağlantını kontrol et

---

## ✅ Migration Sonrası Checklist

- [ ] Neon connection string alındı
- [ ] Railway connection string alındı
- [ ] Migration script çalıştırıldı
- [ ] Tüm tablolar migrate edildi
- [ ] Row count'lar doğrulandı
- [ ] Railway Dashboard'dan kontrol edildi
- [ ] Test kullanıcısı ile login test edildi
- [ ] Admin panel test edildi
- [ ] Push notification test edildi

---

## 🎯 Hızlı Başlangıç

```bash
# 1. Connection string'leri set et
export NEON_DB_URL="postgresql://user:password@neon-host/db?sslmode=require"
export RAILWAY_DB_URL="postgresql://postgres:password@railway-host:port/railway"

# 2. Migration çalıştır
cd /Users/ata/Desktop/alertachart
node scripts/migrate-data-from-neon.cjs

# 3. Verification
# Railway Dashboard → Postgres → Database → Data → Tabloları kontrol et
```

**Tahmini Süre**: 5-15 dakika (veri miktarına göre)

---

## 📊 Beklenen Sonuç

Migration sonrası:
- ✅ Tüm kullanıcılar Railway'de
- ✅ Tüm devices Railway'de
- ✅ Tüm alerts Railway'de
- ✅ Tüm blog posts Railway'de
- ✅ Tüm news Railway'de
- ✅ Tüm sessions Railway'de

**Sonuç**: Neon'daki tüm veriler Railway PostgreSQL'de! 🎉

