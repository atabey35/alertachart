# 📊 Purchase Logs & Admin Panel Setup

Real-time purchase tracking sistemi için kurulum talimatları.

## 🎯 Özellikler

- ✅ **Real-time Tracking**: Satın alımlar anında loglanıyor (Google Play/App Store'dan önce)
- ✅ **Restore Takibi**: Restore işlemleri de kaydediliyor
- ✅ **Hata Analizi**: Başarısız işlemler ve hata mesajları loglanıyor
- ✅ **Expired Downgrade**: Süresi dolmuş subscription'lar loglanıyor
- ✅ **Admin Panel**: Güzel bir dashboard ile tüm işlemleri görüntüleme

## 📋 Adım 1: Database Schema Oluşturma

Database'de `purchase_logs` tablosunu oluşturun:

### Yöntem 1: Node.js Migration Script (Önerilen)

```bash
# Railway PostgreSQL için RAILWAY_DB_URL kullanın
RAILWAY_DB_URL="postgresql://postgres:password@host:port/railway" node scripts/migrate-purchase-logs.js

# Veya .env.local'e RAILWAY_DB_URL ekleyin, sonra:
node scripts/migrate-purchase-logs.js
```

**Railway Connection String Format:**
```
postgresql://postgres:PASSWORD@metro.proxy.rlwy.net:PORT/railway
```

Bu script:
- `.env.local` dosyasından `RAILWAY_DB_URL` veya `DATABASE_URL`'i otomatik okur
- Tüm SQL statement'ları sırayla çalıştırır
- Hataları yakalayıp devam eder
- Tabloyu doğrular
- Hem Railway hem Neon PostgreSQL'i destekler

### Yöntem 2: Neon Web Console

1. [Neon Console](https://console.neon.tech)'a giriş yapın
2. Projenizi seçin
3. "SQL Editor" sekmesine gidin
4. `database/purchase-logs-schema.sql` dosyasının içeriğini kopyalayıp yapıştırın
5. "Run" butonuna tıklayın

### Yöntem 3: psql (Eğer kuruluysa)

```bash
psql $DATABASE_URL -f database/purchase-logs-schema.sql
```

SQL komutu:

```sql
CREATE TABLE IF NOT EXISTS purchase_logs (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  user_id INTEGER,
  platform VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  product_id VARCHAR(255),
  action_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  details TEXT,
  device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_logs_user_email ON purchase_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_user_id ON purchase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_platform ON purchase_logs(platform);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_status ON purchase_logs(status);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_action_type ON purchase_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_created_at ON purchase_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_logs_transaction_id ON purchase_logs(transaction_id);

-- Foreign key
ALTER TABLE purchase_logs 
  ADD CONSTRAINT fk_purchase_logs_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
```

## 🔐 Adım 2: Environment Variable

`.env.local` dosyanıza admin email ekleyin:

```bash
ADMIN_EMAIL=your-admin-email@gmail.com
```

**Not:** Eğer `ADMIN_EMAIL` set edilmezse, varsayılan olarak `kriptokirmizi@gmail.com` kullanılır.

## ✅ Adım 3: Test Etme

1. **Database'de tablo oluşturuldu mu?**
   ```sql
   SELECT * FROM purchase_logs LIMIT 5;
   ```

2. **Admin panele eriş:**
   ```
   https://your-domain.com/admin/sales
   ```

3. **Test satın alma yap:**
   - Uygulamada bir satın alma denemesi yapın
   - Admin panelde log'u görüntüleyin (anında görünmeli)

## 📊 Admin Panel Özellikleri

### İstatistikler

- **Toplam İşlem**: Tüm log kayıtları
- **Başarılı**: Başarılı satın alımlar
- **Başarısız**: Hata alan işlemler
- **Süresi Dolmuş**: Expired downgrade işlemleri
- **Platform Dağılımı**: iOS vs Android
- **İşlem Türü**: Satın Alma vs Restore vs Entitlement Sync

### Tablo Kolonları

- **Tarih**: İşlem zamanı (Türkçe format)
- **Email**: Kullanıcı email'i (Misafir kullanıcılar için "Misafir" yazar)
- **Platform**: iOS (mavi) veya Android (yeşil)
- **İşlem**: Satın Alma (yeşil), Restore (sarı), Sync (mor)
- **Durum**: Başarılı ✅, Süresi Dolmuş ⚠️, Başarısız ❌
- **Transaction ID**: Apple/Google transaction ID
- **Hata**: Hata mesajı (varsa)

## 🔒 Güvenlik

Admin panel sadece şu kontrollerle korunuyor:

1. **Login Check**: Kullanıcı giriş yapmış olmalı
2. **Email Check**: Email `ADMIN_EMAIL` environment variable ile eşleşmeli

**Önemli:** Production'da mutlaka `ADMIN_EMAIL` environment variable'ını set edin!

## 📝 Log Durumları

- `success`: Satın alma başarılı, premium aktif edildi
- `failed`: Receipt verification başarısız (hata mesajı `error_message` alanında)
- `expired_downgrade`: Subscription süresi doldu, kullanıcı free'ye düşürüldü

## 📝 Action Types

- `initial_buy`: İlk satın alma
- `restore`: Restore purchases
- `entitlement_sync`: Otomatik entitlement sync (app startup, foreground, periodic)

## 🚀 Avantajlar

1. **Hız**: Google Play Console'dan 24 saat önce satış verilerini görebilirsiniz
2. **Restore Takibi**: Google Console'da restore işlemleri görünmez, ama burada görürsünüz
3. **Hata Analizi**: Hangi kullanıcılar satın almada sorun yaşıyor görebilirsiniz
4. **Real-time**: İşlem anında loglanır

## 🐛 Troubleshooting

### Log'lar görünmüyor

1. Database'de tablo oluşturuldu mu kontrol edin
2. `verify-purchase` endpoint'inde hata var mı kontrol edin (console logs)
3. Admin panelde hata var mı kontrol edin (browser console)

### Admin panele erişemiyorum

1. Login olduğunuzdan emin olun
2. Email'iniz `ADMIN_EMAIL` ile eşleşiyor mu kontrol edin
3. Environment variable'ı doğru set ettiniz mi kontrol edin

## 📚 İlgili Dosyalar

- `database/purchase-logs-schema.sql` - Database schema
- `app/api/subscription/verify-purchase/route.ts` - Loglama mantığı
- `app/admin/sales/page.tsx` - Admin panel UI
