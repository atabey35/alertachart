# 🔑 Neon Connection String Nasıl Alınır?

## 📋 Adım Adım

### 1. Neon Console'a Giriş Yap
1. [Neon Console](https://console.neon.tech) → Giriş yap
2. Projeni seç (veya yeni proje oluştur)

### 2. Connection String'i Bul
1. Proje sayfasında **"Connection Details"** butonuna tıkla
2. Veya sol menüden **"Connection Details"** sekmesine git

### 3. Connection String'i Kopyala
1. **"Connection string"** kısmında string'i görürsün
2. **"Copy"** butonuna tıkla veya string'i seçip kopyala

**Format:**
```
postgresql://alerta_user:password123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require
```

### 4. Migration Script'inde Kullan
```bash
export NEON_DB_URL="postgresql://alerta_user:password123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require"
export RAILWAY_DB_URL="postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway"

node scripts/migrate-data-from-neon.cjs
```

---

## 🔍 Connection String Formatı

**Genel Format:**
```
postgresql://USERNAME:PASSWORD@HOST/DATABASE?sslmode=require
```

**Örnek:**
```
postgresql://alerta_user:abc123xyz@ep-cool-darkness-123456.us-east-2.aws.neon.tech/alerta?sslmode=require
```

**Bileşenler:**
- `USERNAME`: Neon'da oluşturulan user (örn: `alerta_user`)
- `PASSWORD`: User'ın password'ü
- `HOST`: Neon endpoint (örn: `ep-cool-darkness-123456.us-east-2.aws.neon.tech`)
- `DATABASE`: Database adı (örn: `alerta`)
- `sslmode=require`: SSL zorunlu

---

## ⚠️ Önemli Notlar

1. **Password gizli**: Connection string'de password var, paylaşırken dikkatli ol!
2. **Region**: Host'ta region bilgisi var (örn: `us-east-2`)
3. **SSL zorunlu**: `sslmode=require` mutlaka olmalı

---

## 🚨 Sorun Giderme

### Connection string bulamıyorum
- Neon Console → Project → Connection Details
- Veya sol menüden "Connection Details" sekmesi

### Password hatası
- Connection string'deki password'ü kontrol et
- Neon Console'dan yeni password oluşturabilirsin

### Host hatası
- Connection string'deki host'u kontrol et
- Region doğru mu kontrol et

---

## 📝 Örnek Kullanım

```bash
# 1. Neon connection string'i al (yukarıdaki adımları takip et)
# 2. Terminal'de set et
export NEON_DB_URL="postgresql://alerta_user:gerçek-password@ep-xxx-xxx.us-east-2.aws.neon.tech/alerta?sslmode=require"

# 3. Railway connection string (zaten biliyoruz)
export RAILWAY_DB_URL="postgresql://postgres:vkyWoTCVNwooVbBeZQRfBdtAyUnqWJem@metro.proxy.rlwy.net:22557/railway"

# 4. Migration çalıştır
node scripts/migrate-data-from-neon.cjs
```

---

**Not**: Connection string'deki `user:password` ve `ep-xxx-xxx` placeholder değerler değil, gerçek değerler olmalı!

