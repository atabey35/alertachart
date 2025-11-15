# 💎 Premium Implementation Plan

## 📋 Kullanıcı Planı

### Subscription Flow
1. ✅ Kullanıcı üyeliğini oluşturdu
2. ✅ Ödeme istendi (Google/Apple Store)
3. ✅ Ödemeyi yaptı
4. ✅ **3 günlük free trial başladı**
5. ✅ 3 gün sonra otomatik **pro** üyelik
6. ✅ İptal edene kadar devam eder
7. ✅ İptal ederse **free**'ye döner

### Free Kullanıcı Kısıtlamaları

1. ❌ **AGGR menüsüne erişemez**
2. ❌ **Otomatik fiyat takibi bildirimleri alamaz** (ama local alarm + admin bildirimleri alabilir)
3. ❌ **4-9 lu grafik açamaz**
4. ❌ **10s ve 30s timeframe göremez**

---

## 🔍 Mümkünlük Analizi

### 1. AGGR Menüsü Erişimi ❌

**Mevcut Durum:**
- `app/page.tsx` satır 1363-1375: AGGR butonu var
- `mobileTab === 'aggr'` kontrolü var
- Satır 1072-1086: AGGR tab içeriği var

**Implementasyon:**
```typescript
// Premium kontrolü ekle
const isPremium = user?.plan === 'premium' || isTrialActive(user);

// AGGR butonunu conditional render
{user && isPremium && (
  <button onClick={() => setMobileTab('aggr')}>
    Aggr
  </button>
)}
```

**Mümkünlük:** ✅ **ÇOK KOLAY** - Sadece conditional render

---

### 2. Otomatik Fiyat Takibi Bildirimleri ❌

**Mümkünlük:** ✅ **MÜMKÜN** ama detaylı açıklama gerekli

**İki Farklı Bildirim Türü:**

#### A. Local Alarm Bildirimleri (FREE kullanıcılar alabilir) ✅
- **Kaynak:** `alertService.ts` → `triggerAlert()` → Local notification
- **Nasıl çalışır:** Kullanıcı grafik üzerinde alarm kurar → Fiyat eşiğe gelir → Local notification gösterilir
- **Durum:** Zaten çalışıyor ✅

#### B. Otomatik Fiyat Takibi Bildirimleri (PREMIUM only) ❌
- **Kaynak:** Backend'de çalışan bir servis (muhtemelen `price_alerts` tablosu)
- **Nasıl çalışır:** Backend WebSocket ile fiyatları takip eder → Koşul sağlandığında push notification gönderir
- **Durum:** `PUSH_NOTIFICATIONS.md`'de bahsediliyor ama aktif mi bilinmiyor

**Implementasyon:**
```typescript
// Backend'de (alertachart-backend)
// price_alerts tablosundan alert'leri kontrol ederken:
const user = await getUserFromDeviceId(deviceId);
if (user.plan !== 'premium' && !isTrialActive(user)) {
  // Bildirim gönderme, sadece log
  console.log('Free user, skipping automatic price tracking notification');
  return;
}
```

**Mümkünlük:** ✅ **MÜMKÜN** - Backend'de kontrol ekle

**ÖNEMLİ:** Local alarm bildirimleri (grafik üzerinden kurulan) FREE kullanıcılar için çalışmaya devam edecek. Sadece backend'deki otomatik takip servisi premium olacak.

---

### 3. 4-9 Lu Grafik ❌

**Mevcut Durum:**
- `app/page.tsx` satır 36: `const [layout, setLayout] = useState<1 | 2 | 4 | 9>(1);`
- Layout seçici muhtemelen var (kodda görünmüyor ama olmalı)

**Implementasyon:**
```typescript
// Layout seçici butonlarında
const isPremium = user?.plan === 'premium' || isTrialActive(user);

<button
  onClick={() => {
    if (layout === 4 || layout === 9) {
      if (!isPremium) {
        showUpgradeModal();
        return;
      }
    }
    setLayout(layout);
  }}
  disabled={!isPremium && (layout === 4 || layout === 9)}
>
  {layout === 4 ? '4 Charts' : layout === 9 ? '9 Charts' : '1 Chart'}
</button>
```

**Mümkünlük:** ✅ **KOLAY** - Layout state kontrolü

---

### 4. 10s ve 30s Timeframe ❌

**Mevcut Durum:**
- `utils/constants.ts`: `TIMEFRAMES` array'i var
- Muhtemelen: `[60, 300, 900, 3600, 14400, 86400]` (1m, 5m, 15m, 1h, 4h, 1d)
- 10s = 10, 30s = 30

**Implementasyon:**
```typescript
// utils/constants.ts
export const TIMEFRAMES = [60, 300, 900, 3600, 14400, 86400]; // Free
export const PREMIUM_TIMEFRAMES = [10, 30]; // Premium only

// app/page.tsx - Timeframe butonlarında
const isPremium = user?.plan === 'premium' || isTrialActive(user);
const availableTimeframes = isPremium 
  ? [...TIMEFRAMES, ...PREMIUM_TIMEFRAMES].sort((a, b) => a - b)
  : TIMEFRAMES;

// Timeframe seçici butonlarında
{availableTimeframes.map(tf => (
  <button
    onClick={() => {
      if (PREMIUM_TIMEFRAMES.includes(tf) && !isPremium) {
        showUpgradeModal();
        return;
      }
      setTimeframe(tf);
    }}
  >
    {getTimeframeForHuman(tf)}
  </button>
))}
```

**Mümkünlük:** ✅ **KOLAY** - Timeframe listesini filtrele

---

## 🛠️ Gerekli Değişiklikler

### 1. Premium Check Utility

**Dosya:** `utils/premium.ts` (YENİ)

```typescript
interface User {
  id: number;
  email: string;
  plan: 'free' | 'premium';
  expiry_date?: Date | null;
}

export function isPremium(user: User | null): boolean {
  if (!user) return false;
  
  // Premium plan kontrolü
  if (user.plan === 'premium') {
    // Expiry date kontrolü
    if (user.expiry_date) {
      return new Date(user.expiry_date) > new Date();
    }
    return true; // Expiry date yoksa premium sayılır
  }
  
  return false;
}

export function isTrialActive(user: User | null): boolean {
  if (!user) return false;
  
  // Trial logic: Ödeme yapıldıktan sonra 3 gün trial
  // Bu bilgiyi database'den almak gerekir
  // Şimdilik basit kontrol:
  if (user.plan === 'premium' && user.expiry_date) {
    const trialEndDate = new Date(user.expiry_date);
    trialEndDate.setDate(trialEndDate.getDate() - 30); // Örnek: 30 gün önce premium başladıysa
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    return trialEndDate > threeDaysAgo;
  }
  
  return false;
}

export function hasPremiumAccess(user: User | null): boolean {
  return isPremium(user) || isTrialActive(user);
}
```

### 2. User Plan API

**Dosya:** `app/api/user/plan/route.ts` (YENİ)

```typescript
// GET /api/user/plan
// Kullanıcının plan bilgisini döndürür
export async function GET(request: NextRequest) {
  // Cookie'den user_id al
  // Database'den plan bilgisini çek
  // Return: { plan: 'free' | 'premium', expiry_date: ..., is_trial: boolean }
}
```

### 3. UI Değişiklikleri

**Dosya:** `app/page.tsx`

```typescript
// Premium kontrolü
const [userPlan, setUserPlan] = useState<'free' | 'premium'>('free');
const isPremium = hasPremiumAccess(user);

// AGGR butonu
{user && isPremium && (
  <button onClick={() => setMobileTab('aggr')}>Aggr</button>
)}

// Layout kontrolü
const handleLayoutChange = (newLayout: 1 | 2 | 4 | 9) => {
  if ((newLayout === 4 || newLayout === 9) && !isPremium) {
    showUpgradeModal();
    return;
  }
  setLayout(newLayout);
};

// Timeframe kontrolü
const availableTimeframes = isPremium 
  ? [...TIMEFRAMES, 10, 30].sort((a, b) => a - b)
  : TIMEFRAMES;
```

### 4. Backend Değişiklikleri

**Backend'de (alertachart-backend):**

```typescript
// Otomatik fiyat takibi servisinde
async function checkPriceAlerts() {
  const alerts = await getActivePriceAlerts();
  
  for (const alert of alerts) {
    const user = await getUserFromDeviceId(alert.device_id);
    
    // Premium kontrolü
    if (user.plan !== 'premium' && !isTrialActive(user)) {
      console.log('Free user, skipping automatic notification');
      continue; // Bildirim gönderme
    }
    
    // Bildirim gönder
    await sendPushNotification(...);
  }
}
```

---

## 📊 Database Değişiklikleri

**Zaten var:**
```sql
users.plan → 'free' | 'premium'
users.expiry_date → TIMESTAMP
users.subscription_platform → 'ios' | 'android' | 'web'
users.subscription_id → VARCHAR(255)
```

**Eklenebilir:**
```sql
-- Trial tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
```

---

## 🎯 Implementasyon Sırası

### Phase 1: Premium Check Utility (1 gün)
1. ✅ `utils/premium.ts` oluştur
2. ✅ `app/api/user/plan/route.ts` oluştur
3. ✅ User plan bilgisini frontend'e çek

### Phase 2: UI Restrictions (2 gün)
1. ✅ AGGR menüsü kontrolü
2. ✅ Layout kontrolü (4-9)
3. ✅ Timeframe kontrolü (10s, 30s)
4. ✅ Upgrade modal component

### Phase 3: Backend Restrictions (1 gün)
1. ✅ Otomatik fiyat takibi premium kontrolü
2. ✅ API endpoint'lerde premium kontrolü

### Phase 4: Trial Logic (2 gün)
1. ✅ Trial başlatma (ödeme sonrası)
2. ✅ Trial bitiş kontrolü
3. ✅ Otomatik premium geçişi

---

## ✅ Sonuç

**Tüm özellikler MÜMKÜN ve KOLAY implement edilebilir!**

1. ✅ AGGR menüsü - Conditional render
2. ✅ Otomatik bildirimler - Backend kontrolü
3. ✅ 4-9 lu grafik - Layout state kontrolü
4. ✅ 10s/30s timeframe - Timeframe listesi filtreleme

**ÖNEMLİ NOT:** Local alarm bildirimleri (grafik üzerinden kurulan) FREE kullanıcılar için çalışmaya devam edecek. Sadece backend'deki otomatik takip servisi premium olacak.

---

**Hazır! Hangi özellikle başlamak istersiniz?** 🚀

