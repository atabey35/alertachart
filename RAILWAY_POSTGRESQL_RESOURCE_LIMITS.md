# 🗄️ Railway PostgreSQL Resource Limits - Kullanıcı Sayısına Göre Öneriler

## 📊 Mevcut Durum

**Connection Pool Ayarları:**
```typescript
// lib/db.ts
max: 20,              // Maximum 20 connection
idle_timeout: 30,     // 30 saniye sonra idle connection kapat
connect_timeout: 10,   // 10 saniye connection timeout
```

**PostgreSQL Varsayılan Limitler:**
- `max_connections`: 100 (Railway'de genellikle bu değer)
- Connection pool: 20 (uygulama seviyesinde)

---

## 🎯 Kullanıcı Sayısına Göre Öneriler

### 1. 100 Kullanıcı (Küçük Ölçek)

**Tahmini Yük:**
- Eşzamanlı aktif kullanıcı: ~10-20
- Günlük aktif kullanıcı: ~30-50
- API çağrıları: ~50K-100K/ay
- Database queries: ~30K-50K/ay

**Önerilen Resource Limits:**
- **CPU**: **1-2 vCPU** ✅ (Minimum yeterli)
- **Memory**: **2-4 GB** ✅ (Minimum yeterli)

**Neden:**
- Düşük eşzamanlı bağlantı (10-20)
- Connection pool (20) yeterli
- Basit sorgular, düşük veri hacmi

**Railway Plan:**
- Hobby Plan ($5/ay) yeterli
- Veya Pro Plan ($20/ay) - daha iyi performans için

---

### 2. 1,000 Kullanıcı (Orta Ölçek)

**Tahmini Yük:**
- Eşzamanlı aktif kullanıcı: ~100-200
- Günlük aktif kullanıcı: ~300-500
- API çağrıları: ~500K-1M/ay
- Database queries: ~300K-500K/ay

**Önerilen Resource Limits:**
- **CPU**: **2-4 vCPU** ✅ (Orta seviye)
- **Memory**: **4-8 GB** ✅ (Orta seviye)

**Neden:**
- Orta eşzamanlı bağlantı (100-200)
- Connection pool (20) yeterli (connection pooling sayesinde)
- Daha fazla sorgu, daha fazla veri

**Railway Plan:**
- Pro Plan ($20/ay) önerilir
- Veya daha yüksek plan (daha iyi performans için)

**Optimizasyon:**
- Connection pool'u 20'de tut (yeterli)
- Index'leri optimize et
- Query'leri optimize et

---

### 3. 10,000 Kullanıcı (Büyük Ölçek)

**Tahmini Yük:**
- Eşzamanlı aktif kullanıcı: ~1,000-2,000
- Günlük aktif kullanıcı: ~3,000-5,000
- API çağrıları: ~5M-10M/ay
- Database queries: ~3M-5M/ay

**Önerilen Resource Limits:**
- **CPU**: **4-8 vCPU** ✅ (Yüksek seviye)
- **Memory**: **8-16 GB** ✅ (Yüksek seviye)

**Neden:**
- Yüksek eşzamanlı bağlantı (1,000-2,000)
- Connection pool (20) yeterli (connection pooling sayesinde)
- Çok fazla sorgu, çok fazla veri
- Daha fazla CPU ve memory gerekiyor

**Railway Plan:**
- Pro Plan ($20/ay) veya daha yüksek plan
- Enterprise Plan gerekebilir

**Optimizasyon:**
- Connection pool'u 20-30'a çıkar (gerekirse)
- PgBouncer kullan (connection pooling için)
- Read replicas kullan (okuma performansı için)
- Index'leri optimize et
- Query'leri optimize et
- Caching stratejisi uygula

---

## 📈 Connection Pooling Stratejisi

### Mevcut Ayarlar (lib/db.ts)
```typescript
max: 20,              // Maximum 20 connection
idle_timeout: 30,     // 30 saniye sonra idle connection kapat
connect_timeout: 10,   // 10 saniye connection timeout
```

### Kullanıcı Sayısına Göre Connection Pool Önerileri

| Kullanıcı Sayısı | Eşzamanlı Aktif | Connection Pool | Açıklama |
|------------------|-----------------|-----------------|----------|
| 100 | 10-20 | 20 | ✅ Yeterli |
| 1,000 | 100-200 | 20-30 | ✅ Yeterli (connection pooling sayesinde) |
| 10,000 | 1,000-2,000 | 30-50 | ⚠️ Artırılabilir |

**Not:** Connection pooling sayesinde 20 connection binlerce kullanıcıyı handle edebilir. Her kullanıcı için ayrı connection açılmaz, connection'lar paylaşılır.

---

## 🔧 Railway PostgreSQL Resource Limit Ayarları

### Railway Dashboard'da Ayarlama

1. **Railway Dashboard** → PostgreSQL service'ine git
2. **Settings** → **Resource Limits** sekmesine git
3. **CPU** ve **Memory** slider'larını ayarla
4. **Save** butonuna tıkla

### Önerilen Ayarlar

#### 100 Kullanıcı
```
CPU: 1-2 vCPU
Memory: 2-4 GB
```

#### 1,000 Kullanıcı
```
CPU: 2-4 vCPU
Memory: 4-8 GB
```

#### 10,000 Kullanıcı
```
CPU: 4-8 vCPU
Memory: 8-16 GB
```

---

## 💰 Maliyet Tahminleri

### Railway Pro Plan Fiyatlandırması

**Pro Plan: $20/ay kullanım kredisi içerir**

Railway'de resource limits'e göre fiyatlandırma yapılır:
- **vCPU başına**: ~$20/ay
- **GB RAM başına**: ~$10/ay

### Resource Limits Maliyeti (Pro Plan - $20 kredi dahil)

| CPU | Memory | Hesaplama | Toplam Maliyet | $20 Kredi Sonrası |
|-----|--------|-----------|----------------|-------------------|
| 1 vCPU | 2 GB | $20 + $20 = $40 | **$40/ay** | **+$20/ay** ⚠️ |
| 1 vCPU | 1 GB | $20 + $10 = $30 | **$30/ay** | **+$10/ay** ⚠️ |
| 0.5 vCPU | 1 GB | $10 + $10 = $20 | **$20/ay** | **$0/ay** ✅ |
| 0.5 vCPU | 0.5 GB | $10 + $5 = $15 | **$15/ay** | **-$5/ay** ✅ |

**⚠️ ÖNEMLİ:** Pro Plan'ın $20/ay kredisi var, ama resource limits'e göre ek ücret ödeniyor!

### $20 Kotasını Geçmemek İçin Öneriler

#### 100 Kullanıcı (Kotayı Geçmemek İçin)
- **CPU**: **0.5-1 vCPU** ✅
- **Memory**: **1-2 GB** ✅
- **Toplam Maliyet**: $15-30/ay
- **$20 Kredi Sonrası**: -$5 ile +$10/ay arası

#### 1,000 Kullanıcı (Kotayı Geçmemek İçin)
- **CPU**: **1 vCPU** ✅
- **Memory**: **2 GB** ✅
- **Toplam Maliyet**: $30/ay
- **$20 Kredi Sonrası**: **+$10/ay** ⚠️

**Alternatif:** Başlangıçta 0.5 vCPU + 1 GB ile başla, gerektiğinde artır.

#### 10,000 Kullanıcı (Kotayı Geçmemek İçin)
- **CPU**: **1-2 vCPU** ⚠️
- **Memory**: **2-4 GB** ⚠️
- **Toplam Maliyet**: $40-80/ay
- **$20 Kredi Sonrası**: **+$20-60/ay** ⚠️

**Not:** 10,000 kullanıcı için $20 kotasını geçmemek zor. Optimizasyon yap veya daha yüksek plan düşün.

---

## 🚀 Performans Optimizasyonu

### 1. Connection Pooling
- ✅ Mevcut: 20 connection pool
- ✅ Yeterli: 100-10,000 kullanıcı için
- ⚠️ 10,000+ kullanıcı için: 30-50'ye çıkarılabilir

### 2. Index Optimization
- ✅ Tüm önemli kolonlarda index var
- ✅ Foreign key'lerde index var
- ✅ Query performansı optimize

### 3. Query Optimization
- ✅ Prepared statements kullanılıyor
- ✅ Connection pooling aktif
- ✅ Idle connection'lar otomatik kapanıyor

### 4. Caching Strategy
- ✅ API response caching (Next.js)
- ✅ Static asset caching (Vercel)
- ⚠️ Database query caching eklenebilir (Redis)

---

## 📊 Monitoring ve Alerting

### Railway Metrics
- **CPU Usage**: %70'in üzerinde ise artır
- **Memory Usage**: %80'in üzerinde ise artır
- **Connection Count**: max_connections'a yaklaşıyorsa artır
- **Query Time**: Yavaş sorguları optimize et

### Önerilen Monitoring
1. Railway Dashboard → Metrics
2. CPU ve Memory kullanımını izle
3. Connection count'u izle
4. Query performance'ı izle

---

## 🎯 Sonuç ve Öneriler

### 100 Kullanıcı ($20 Kotasını Geçmemek İçin)
- **CPU**: **0.5-1 vCPU** ✅
- **Memory**: **1-2 GB** ✅
- **Connection Pool**: 20 (yeterli)
- **Plan**: Pro ($20/ay)
- **Toplam Maliyet**: $15-30/ay
- **$20 Kredi Sonrası**: -$5 ile +$10/ay

### 1,000 Kullanıcı ($20 Kotasını Geçmemek İçin)
- **CPU**: **1 vCPU** ✅
- **Memory**: **2 GB** ✅
- **Connection Pool**: 20 (yeterli)
- **Plan**: Pro ($20/ay)
- **Toplam Maliyet**: $30/ay
- **$20 Kredi Sonrası**: **+$10/ay** ⚠️

**Alternatif:** Başlangıçta 0.5 vCPU + 1 GB ile başla, performansı izle.

### 10,000 Kullanıcı ($20 Kotasını Geçmemek İçin)
- **CPU**: **1-2 vCPU** ⚠️
- **Memory**: **2-4 GB** ⚠️
- **Connection Pool**: 20-30
- **Plan**: Pro ($20/ay)
- **Toplam Maliyet**: $40-80/ay
- **$20 Kredi Sonrası**: **+$20-60/ay** ⚠️

**Not:** 10,000 kullanıcı için $20 kotasını geçmemek zor. Optimizasyon yap veya daha yüksek plan düşün.

---

## ⚠️ Önemli Notlar

1. **Connection Pooling**: 20 connection binlerce kullanıcıyı handle edebilir (connection pooling sayesinde)
2. **Resource Limits**: Başlangıçta düşük tut, gerektiğinde artır
3. **Monitoring**: CPU ve Memory kullanımını sürekli izle
4. **Optimization**: Query'leri ve index'leri optimize et
5. **Scaling**: Kullanıcı sayısı arttıkça resource limits'i artır

---

## 🔄 Resource Limits Artırma Adımları

1. Railway Dashboard → PostgreSQL service
2. Settings → Resource Limits
3. CPU ve Memory slider'larını artır
4. Save
5. Database otomatik olarak yeniden başlatılır
6. Monitoring yap, performansı kontrol et

---

**Sonuç:** Mevcut ayarlar (20 connection pool) 100-10,000 kullanıcı için yeterli. Resource limits'i (CPU/Memory) kullanıcı sayısına göre ayarla.

