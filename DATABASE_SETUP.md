# Database URL Kurulumu

## Neon Database Oluşturma

### 1. Neon Hesabı Oluşturun
1. [Neon Console](https://console.neon.tech) → Sign up / Login
2. Ücretsiz hesap oluşturun

### 2. Yeni Proje Oluşturun
1. "Create a project" butonuna tıklayın
2. Proje adı: `alerta` (veya istediğiniz isim)
3. Database adı: `alerta` (otomatik)
4. PostgreSQL version: Latest (önerilen)
5. Region: Size en yakın (EU, US, etc.)
6. "Create project" butonuna tıklayın

### 3. Connection String'i Alın
1. Proje oluşturulduktan sonra "Connection Details" sekmesine gidin
2. "Connection string" kısmında string'i kopyalayın
3. Format: `postgresql://user:password@host/database?sslmode=require`

**Örnek:**
```
postgresql://alerta_user:password123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require
```

### 4. .env.local Dosyası Oluşturun
```bash
cd /Users/ata/Desktop/alertachart
cat > .env.local << EOF
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
ADMIN_PASSWORD=alerta2024
BACKEND_URL=https://alertachart-backend-production.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://alertachart-backend-production.up.railway.app
EOF
```

### 5. Vercel'e Environment Variable Ekleyin
Vercel Dashboard → Project Settings → Environment Variables:
- Name: `DATABASE_URL`
- Value: Connection string'inizi yapıştırın
- Environments: Production, Preview, Development ✅

## Database Tabloları
Tablolar otomatik oluşturulur (ilk API çağrısında). Manuel oluşturmak için:

1. Neon Console → SQL Editor
2. Aşağıdaki SQL'i çalıştırın (veya `database/push-schema.sql` dosyasını kullanın)

```sql
-- devices tablosu
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  expo_push_token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- price_alerts tablosu
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  proximity_delta DECIMAL(20, 8) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  last_price DECIMAL(20, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- alarm_subscriptions tablosu
CREATE TABLE IF NOT EXISTS alarm_subscriptions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  alarm_key VARCHAR(255) NOT NULL,
  symbol VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, alarm_key),
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alerts_device_id ON price_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
```

## Kontrol
Database bağlantısını test etmek için:
```bash
npm run dev
# Backend başladığında otomatik olarak tablolar oluşturulur
```

## Notlar
- Neon ücretsiz tier: 0.5 GB storage, sınırlı compute
- Production için paid plan önerilir
- Connection string'i güvenli tutun (public repo'ya commit etmeyin)
- `.env.local` dosyası `.gitignore`'da olduğu için git'e eklenmez











