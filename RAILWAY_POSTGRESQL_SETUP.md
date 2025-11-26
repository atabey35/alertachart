# 🚂 Railway PostgreSQL Kurulum ve Entegrasyon Rehberi

## 📋 İçindekiler

1. [Railway'de PostgreSQL Oluşturma](#1-railwayde-postgresql-oluşturma)
2. [Connection String Alma](#2-connection-string-alma)
3. [Kod Değişiklikleri](#3-kod-değişiklikleri)
4. [Environment Variables](#4-environment-variables)
5. [Database Migration](#5-database-migration)
6. [Connection Pooling Setup](#6-connection-pooling-setup)
7. [Test ve Doğrulama](#7-test-ve-doğrulama)

---

## 1. Railway'de PostgreSQL Oluşturma

### Adım 1: Railway Dashboard'a Giriş
1. [Railway Dashboard](https://railway.app) → Giriş yapın
2. Mevcut projenize gidin veya yeni proje oluşturun

### Adım 2: PostgreSQL Service Ekleme
1. Proje sayfasında **"+ New"** butonuna tıklayın
2. **"Database"** sekmesine gidin
3. **"Add PostgreSQL"** seçeneğini seçin
4. Railway otomatik olarak PostgreSQL container'ı oluşturacak

### Adım 3: Service Ayarları
- **Service Name**: `postgres` (veya istediğiniz isim)
- **Plan**: Hobby ($5/ay) veya Pro ($20/ay)
- Railway otomatik olarak:
  - PostgreSQL 15+ kurulumu
  - Database oluşturma
  - Connection string oluşturma
  - Otomatik yedekleme

---

## 2. Connection String Alma

### Railway'den Connection String
1. PostgreSQL service'ine tıklayın
2. **"Variables"** sekmesine gidin
3. `DATABASE_URL` veya `POSTGRES_URL` değişkenini bulun
4. Connection string'i kopyalayın

**Format:**
```
postgresql://postgres:password@hostname:port/railway?sslmode=require
```

**Örnek:**
```
postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway?sslmode=require
```

### Alternatif: Manuel Connection String
Eğer `DATABASE_URL` yoksa, şu bilgileri kullanarak oluşturun:
- **Host**: Railway service'in public domain'i
- **Port**: 5432 (default)
- **Database**: `railway` (default)
- **User**: `postgres` (default)
- **Password**: Railway'de oluşturulan password

**Format:**
```
postgresql://postgres:PASSWORD@HOST:5432/railway?sslmode=require
```

---

## 3. Kod Değişiklikleri

### Mevcut Durum
Sistemde `@neondatabase/serverless` kullanılıyor:
```typescript
import { neon } from '@neondatabase/serverless';

const getSql = () => {
  return neon(process.env.DATABASE_URL);
};
```

### Yeni Durum: Standard PostgreSQL Client

#### Seçenek 1: `pg` (Node.js PostgreSQL Client) - Önerilen

**package.json'a ekle:**
```bash
npm install pg
npm install --save-dev @types/pg
```

**Kod değişikliği:**
```typescript
import { Pool } from 'pg';

// Connection pool oluştur (singleton pattern)
let pool: Pool | null = null;

const getPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Railway SSL için
      },
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  return pool;
};

// Neon-compatible SQL template tag
const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const pool = getPool();
  const query = strings.reduce((acc, str, i) => {
    return acc + str + (i < values.length ? `$${i + 1}` : '');
  }, '');
  return pool.query(query, values);
};

// Neon-compatible async function
const getSql = () => {
  const pool = getPool();
  return {
    async query(strings: TemplateStringsArray, ...values: any[]) {
      const query = strings.reduce((acc, str, i) => {
        return acc + str + (i < values.length ? `$${i + 1}` : '');
      }, '');
      const result = await pool.query(query, values);
      return result.rows;
    }
  };
};
```

#### Seçenek 2: `postgres` (Daha Modern) - Alternatif

**package.json'a ekle:**
```bash
npm install postgres
```

**Kod değişikliği:**
```typescript
import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 20, // Connection pool size
      idle_timeout: 30,
      connect_timeout: 2,
    });
  }
  
  return sql;
};
```

**Kullanım (Neon ile aynı):**
```typescript
const sql = getSql();
const users = await sql`SELECT * FROM users WHERE email = ${email}`;
```

---

## 4. Environment Variables

### Vercel (Frontend)
1. Vercel Dashboard → Project Settings → Environment Variables
2. `DATABASE_URL` değişkenini güncelleyin:
   ```
   DATABASE_URL=postgresql://postgres:password@host:5432/railway?sslmode=require
   ```
3. **Production**, **Preview**, **Development** için işaretleyin
4. Deploy'u yeniden başlatın

### Railway (Backend)
1. Railway Dashboard → Service → Variables
2. `DATABASE_URL` değişkenini ekleyin/güncelleyin
3. Railway otomatik olarak redeploy edecek

### Local Development
`.env.local` dosyasını güncelleyin:
```bash
DATABASE_URL=postgresql://postgres:password@host:5432/railway?sslmode=require
```

---

## 5. Database Migration

### Adım 1: Neon'dan Database Dump
```bash
# Neon connection string ile dump al
pg_dump "postgresql://user:password@neon-host/database?sslmode=require" > neon_dump.sql
```

### Adım 2: Railway'e Import
```bash
# Railway connection string ile import et
psql "postgresql://postgres:password@railway-host:5432/railway?sslmode=require" < neon_dump.sql
```

### Alternatif: Railway Dashboard'dan
1. Railway Dashboard → PostgreSQL Service → **"Connect"** butonuna tıklayın
2. **"Query"** sekmesine gidin
3. SQL script'lerinizi çalıştırın

### Mevcut Schema Dosyalarını Kullanma
```bash
# database/ klasöründeki SQL dosyalarını kullan
psql $DATABASE_URL -f database/auth-schema.sql
psql $DATABASE_URL -f database/push-schema.sql
psql $DATABASE_URL -f database/news-schema.sql
```

---

## 6. Connection Pooling Setup

### `pg` ile Connection Pooling
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});

// Health check
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

### `postgres` ile Connection Pooling
```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 20, // Connection pool size
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 2, // Timeout after 2s
});
```

---

## 7. Test ve Doğrulama

### Test Script
```typescript
// test-db-connection.ts
import { getSql } from './lib/db';

async function testConnection() {
  try {
    const sql = getSql();
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connection successful!');
    console.log('Current time:', result[0].current_time);
    console.log('PostgreSQL version:', result[0].pg_version);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

### API Endpoint Test
```bash
# Health check endpoint
curl https://www.alertachart.com/api/user/plan

# Blog endpoint
curl https://www.alertachart.com/api/blog
```

---

## 🔄 Migration Planı (Neon → Railway)

### Phase 1: Hazırlık
1. ✅ Railway'de PostgreSQL service oluştur
2. ✅ Connection string'i al
3. ✅ Kod değişikliklerini yap (local'de test et)
4. ✅ Database schema'yı Railway'e import et

### Phase 2: Staging Test
1. ✅ Staging environment'da test et
2. ✅ Connection pooling test et
3. ✅ Performance test et
4. ✅ Error handling test et

### Phase 3: Production Migration
1. ✅ Production'da kod değişikliklerini deploy et
2. ✅ Environment variable'ı güncelle
3. ✅ Database migration'ı çalıştır
4. ✅ Test et ve doğrula

### Phase 4: Cleanup
1. ✅ Neon database'i kapat (opsiyonel)
2. ✅ Neon environment variable'ları kaldır
3. ✅ Monitoring setup et

---

## 📝 Kod Örnekleri

### Örnek 1: Basit Query
```typescript
// Önceki (Neon)
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const users = await sql`SELECT * FROM users WHERE email = ${email}`;

// Yeni (Railway - pg)
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
const users = result.rows;

// Yeni (Railway - postgres) - Neon ile aynı syntax
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);
const users = await sql`SELECT * FROM users WHERE email = ${email}`;
```

### Örnek 2: Transaction
```typescript
// Önceki (Neon)
const sql = neon(process.env.DATABASE_URL!);
await sql`BEGIN`;
await sql`INSERT INTO users ...`;
await sql`COMMIT`;

// Yeni (Railway - pg)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO users ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

// Yeni (Railway - postgres)
const sql = postgres(process.env.DATABASE_URL!);
await sql.begin(async sql => {
  await sql`INSERT INTO users ...`;
});
```

---

## 🎯 Önerilen Yaklaşım

### Seçenek 1: `postgres` Paketi (Önerilen)
✅ **Avantajlar:**
- Neon ile aynı syntax (minimal kod değişikliği)
- Modern ve performanslı
- Template literal support
- Transaction support

**Kurulum:**
```bash
npm install postgres
```

**Kod:**
```typescript
import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 20,
      idle_timeout: 30,
      connect_timeout: 2,
    });
  }
  
  return sql;
};
```

### Seçenek 2: `pg` Paketi
✅ **Avantajlar:**
- En yaygın PostgreSQL client
- İyi dokümantasyon
- Connection pooling built-in

❌ **Dezavantajlar:**
- Syntax farklı (template literal yok)
- Daha fazla kod değişikliği gerekir

---

## 🚀 Hızlı Başlangıç

### 1. Railway'de PostgreSQL Oluştur
```bash
# Railway Dashboard → New → Database → Add PostgreSQL
```

### 2. Connection String'i Al
```bash
# Railway Dashboard → PostgreSQL Service → Variables → DATABASE_URL
```

### 3. Package Install
```bash
cd /Users/ata/Desktop/alertachart
npm install postgres
```

### 4. Kod Değişikliği
Tüm `@neondatabase/serverless` import'larını `postgres` ile değiştir:
```typescript
// Önceki
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

// Yeni
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 20,
});
```

### 5. Environment Variable Güncelle
```bash
# Vercel ve Railway'de DATABASE_URL'i güncelle
```

### 6. Test Et
```bash
npm run dev
# API endpoint'leri test et
```

---

## 📊 Maliyet Karşılaştırması

| Özellik | Neon Scale | Railway PostgreSQL |
|---------|------------|-------------------|
| **1K kullanıcı** | $19/ay | $5.5-6.25/ay ✅ |
| **10K kullanıcı** | $69/ay | $22.5-25/ay ✅ |
| **Storage** | 0.5GB (Free) | Unlimited* |
| **Bandwidth** | Unlimited | Unlimited |
| **Connection Pooling** | ✅ Built-in | ⚠️ Manuel setup |
| **Backup** | ✅ | ✅ Auto |

*Railway'de storage ek ücretli ($0.25/GB/ay)

---

## 🔧 Troubleshooting

### Connection Timeout
```typescript
// Connection timeout artır
const sql = postgres(process.env.DATABASE_URL!, {
  connect_timeout: 10, // 10 saniye
});
```

### SSL Hatası
```typescript
// SSL ayarları
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: {
    rejectUnauthorized: false // Railway için
  },
});
```

### Connection Pool Exhausted
```typescript
// Pool size artır
const sql = postgres(process.env.DATABASE_URL!, {
  max: 50, // Daha fazla connection
});
```

---

## ✅ Checklist

- [ ] Railway'de PostgreSQL service oluşturuldu
- [ ] Connection string alındı
- [ ] `postgres` paketi yüklendi
- [ ] Kod değişiklikleri yapıldı
- [ ] Environment variables güncellendi
- [ ] Database schema import edildi
- [ ] Local'de test edildi
- [ ] Staging'de test edildi
- [ ] Production'da deploy edildi
- [ ] Monitoring setup edildi

---

## 📝 Notlar

- **Migration süresi**: 2-4 saat
- **Downtime**: Minimal (read-only mode'da migration)
- **Rollback planı**: Neon connection string'i saklayın
- **Monitoring**: Railway metrics + custom logging

**Sonuç**: Railway PostgreSQL, Neon'dan daha ucuz ve backend ile aynı platform! 🎯

