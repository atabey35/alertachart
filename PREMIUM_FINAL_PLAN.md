# 💎 Premium System - Final Implementation Plan

## 📋 Netleştirilmiş Plan

### 1. Trial Başlangıcı
- ✅ **İlk girişle birlikte tetiklenen** (kullanıcı oluşturulduğunda)
- ✅ **Ödeme yapıldığında başlanan** (3 günlük trial)
- ❌ Ödeme yapmazsa → Pro özellikleri kullanamaz (free kalır)

**Flow:**
```
Kullanıcı kayıt oldu → trial_started_at = NULL, plan = 'free'
Ödeme yaptı → trial_started_at = NOW(), plan = 'premium'
3 gün sonra → trial_ended_at kontrolü, plan = 'premium' (devam eder)
Aylık kontrol → Ödeme yapıldı mı? Evet → premium, Hayır → free
```

### 2. Premium Geçiş
- ❌ **3 gün sonra otomatik premium geçişi YOK**
- ✅ Ödeme yaptıysa → Direkt premium (trial bitince de premium kalır)
- ✅ Ödeme yapmadıysa → Free üye olarak kalır
- ✅ **Aylık kontrol:** Subscription durumu kontrol edilir

**Flow:**
```
Ödeme yapıldı → plan = 'premium', expiry_date = NOW() + 30 gün
Aylık kontrol (cron job) → expiry_date geçti mi?
  - Evet → Apple/Google'dan subscription durumu kontrol et
  - Hala aktif → expiry_date güncelle
  - İptal edilmiş → plan = 'free', expiry_date = NULL
```

### 3. Backend Servis
- ✅ Backend'de aktif servis var (otomatik fiyat takibi)
- ✅ Free kullanıcılar için **devre dışı** olmalı

### 4. Admin Broadcast
- ✅ Admin panelinden gönderilen bildirimler → **Herkes alır** (free + premium)
- ✅ `/api/admin/broadcast` üzerinden gönderiliyor
- ✅ Premium kontrolü **YOK** (herkese gider)

### 5. Timeframe
- ✅ 10s ve 30s → **Premium only**
- ✅ Free kullanıcılar göremez

### 6. AGGR Menüsü
- ✅ **Free kullanıcılar menüyü görür** (buton görünür)
- ❌ **İçeriği göremez** (premium only)
- ✅ Upgrade mesajı + tanıtım şablonu gösterilir

---

## 🗄️ Database Schema

### Mevcut
```sql
users.plan → 'free' | 'premium'
users.expiry_date → TIMESTAMP
users.subscription_platform → 'ios' | 'android' | 'web'
users.subscription_id → VARCHAR(255)
```

### Eklenmeli
```sql
-- Trial tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_subscription_check TIMESTAMP;

-- Index for subscription checks
CREATE INDEX IF NOT EXISTS idx_users_expiry_date ON users(expiry_date) WHERE plan = 'premium';
CREATE INDEX IF NOT EXISTS idx_users_trial ON users(trial_started_at) WHERE trial_started_at IS NOT NULL;
```

---

## 🔧 Implementation Details

### 1. Premium Check Utility

**Dosya:** `utils/premium.ts` (YENİ)

```typescript
interface User {
  id: number;
  email: string;
  plan: 'free' | 'premium';
  expiry_date?: Date | string | null;
  trial_started_at?: Date | string | null;
  trial_ended_at?: Date | string | null;
  subscription_started_at?: Date | string | null;
}

/**
 * Kullanıcı premium mu?
 */
export function isPremium(user: User | null): boolean {
  if (!user) return false;
  
  if (user.plan === 'premium') {
    // Expiry date kontrolü
    if (user.expiry_date) {
      const expiry = new Date(user.expiry_date);
      return expiry > new Date();
    }
    // Expiry date yoksa premium sayılır (yeni premium kullanıcı)
    return true;
  }
  
  return false;
}

/**
 * Trial aktif mi?
 */
export function isTrialActive(user: User | null): boolean {
  if (!user || !user.trial_started_at) return false;
  
  const trialStart = new Date(user.trial_started_at);
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 3); // 3 gün trial
  
  const now = new Date();
  
  // Trial başladı mı ve bitmedi mi?
  return trialStart <= now && now < trialEnd;
}

/**
 * Premium erişimi var mı? (Premium veya trial aktif)
 */
export function hasPremiumAccess(user: User | null): boolean {
  return isPremium(user) || isTrialActive(user);
}
```

### 2. User Plan API

**Dosya:** `app/api/user/plan/route.ts` (YENİ)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user from database
    const users = await sql`
      SELECT 
        id,
        email,
        plan,
        expiry_date,
        trial_started_at,
        trial_ended_at,
        subscription_started_at,
        subscription_platform,
        subscription_id
      FROM users
      WHERE email = ${session.user.email}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    
    // Check if premium is still valid
    const isPremium = user.plan === 'premium' && 
      (!user.expiry_date || new Date(user.expiry_date) > new Date());
    
    // Check if trial is active
    const trialStart = user.trial_started_at ? new Date(user.trial_started_at) : null;
    const trialEnd = trialStart ? new Date(trialStart) : null;
    if (trialEnd) trialEnd.setDate(trialEnd.getDate() + 3);
    
    const isTrial = trialStart && trialEnd && 
      new Date() >= trialStart && new Date() < trialEnd;
    
    return NextResponse.json({
      plan: isPremium ? 'premium' : 'free',
      isPremium,
      isTrial,
      expiryDate: user.expiry_date,
      trialStartedAt: user.trial_started_at,
      trialEndsAt: trialEnd?.toISOString(),
      hasPremiumAccess: isPremium || isTrial,
    });
  } catch (error: any) {
    console.error('[User Plan API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user plan' },
      { status: 500 }
    );
  }
}
```

### 3. Payment Webhook (Ödeme Yapıldığında)

**Dosya:** `app/api/subscription/webhook/route.ts` (YENİ)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/subscription/webhook
 * Apple/Google subscription webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Apple/Google'dan gelen subscription event
    const { 
      user_id, 
      subscription_id, 
      platform, // 'ios' | 'android'
      event_type, // 'subscribed' | 'renewed' | 'cancelled' | 'expired'
      expiry_date 
    } = body;
    
    // Find user by subscription_id or user_id
    const users = await sql`
      SELECT id FROM users 
      WHERE subscription_id = ${subscription_id} 
      OR id = ${user_id}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = users[0].id;
    
    if (event_type === 'subscribed' || event_type === 'renewed') {
      // Ödeme yapıldı → Premium + Trial başlat
      const now = new Date();
      const expiry = expiry_date ? new Date(expiry_date) : new Date();
      expiry.setMonth(expiry.getMonth() + 1); // 1 ay sonra
      
      await sql`
        UPDATE users
        SET 
          plan = 'premium',
          expiry_date = ${expiry.toISOString()},
          trial_started_at = COALESCE(trial_started_at, ${now.toISOString()}),
          subscription_started_at = COALESCE(subscription_started_at, ${now.toISOString()}),
          subscription_platform = ${platform},
          subscription_id = ${subscription_id},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      console.log(`[Subscription] User ${userId} upgraded to premium with trial`);
    } else if (event_type === 'cancelled' || event_type === 'expired') {
      // İptal edildi → Free'ye dön
      await sql`
        UPDATE users
        SET 
          plan = 'free',
          expiry_date = NULL,
          updated_at = NOW()
        WHERE id = ${userId}
      `;
      
      console.log(`[Subscription] User ${userId} downgraded to free`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Subscription Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

### 4. Monthly Subscription Check (Cron Job)

**Backend'de (alertachart-backend):**

```typescript
// Cron job: Her gün çalışır, premium kullanıcıların expiry_date'ini kontrol eder
async function checkSubscriptions() {
  const expiredUsers = await sql`
    SELECT id, subscription_id, subscription_platform
    FROM users
    WHERE plan = 'premium'
    AND expiry_date < NOW()
  `;
  
  for (const user of expiredUsers) {
    // Apple/Google'dan subscription durumunu kontrol et
    const subscriptionStatus = await checkSubscriptionStatus(
      user.subscription_id,
      user.subscription_platform
    );
    
    if (subscriptionStatus.active) {
      // Hala aktif → expiry_date güncelle
      await sql`
        UPDATE users
        SET expiry_date = ${subscriptionStatus.expiry_date},
            last_subscription_check = NOW()
        WHERE id = ${user.id}
      `;
    } else {
      // İptal edilmiş → Free'ye dön
      await sql`
        UPDATE users
        SET plan = 'free',
            expiry_date = NULL,
            last_subscription_check = NOW()
        WHERE id = ${user.id}
      `;
    }
  }
}
```

### 5. UI Restrictions

**Dosya:** `app/page.tsx`

```typescript
// Premium kontrolü
const [userPlan, setUserPlan] = useState<{
  plan: 'free' | 'premium';
  hasPremiumAccess: boolean;
  isTrial: boolean;
} | null>(null);

useEffect(() => {
  // Fetch user plan
  fetch('/api/user/plan')
    .then(res => res.json())
    .then(data => setUserPlan(data));
}, [user]);

const hasPremiumAccess = userPlan?.hasPremiumAccess ?? false;

// AGGR butonu - Herkes görür
{user && (
  <button onClick={() => setMobileTab('aggr')}>Aggr</button>
)}

// AGGR içeriği - Premium kontrolü
{mobileTab === 'aggr' && (
  hasPremiumAccess ? (
    <iframe src="https://aggr.alertachart.com?embed=true" />
  ) : (
    <UpgradeModal />
  )
)}

// Layout kontrolü (4-9)
const handleLayoutChange = (newLayout: 1 | 2 | 4 | 9) => {
  if ((newLayout === 4 || newLayout === 9) && !hasPremiumAccess) {
    showUpgradeModal();
    return;
  }
  setLayout(newLayout);
};

// Timeframe kontrolü (10s, 30s)
const availableTimeframes = hasPremiumAccess
  ? TIMEFRAMES // [10, 30, 60, 300, ...]
  : TIMEFRAMES.filter(tf => tf !== 10 && tf !== 30); // [60, 300, ...]
```

### 6. Backend Otomatik Fiyat Takibi

**Backend'de (alertachart-backend):**

```typescript
// Otomatik fiyat takibi servisinde
async function checkPriceAlerts() {
  const alerts = await getActivePriceAlerts();
  
  for (const alert of alerts) {
    const user = await getUserFromDeviceId(alert.device_id);
    
    // Premium kontrolü
    if (!hasPremiumAccess(user)) {
      console.log(`Free user ${user.id}, skipping automatic notification`);
      continue; // Bildirim gönderme
    }
    
    // Bildirim gönder (sadece premium kullanıcılar)
    await sendPushNotification(...);
  }
}
```

### 7. Upgrade Modal Component

**Dosya:** `components/UpgradeModal.tsx` (YENİ)

```typescript
'use client';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string; // 'aggr' | 'layout' | 'timeframe'
}

export default function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          Pro Üyelik Gerekli
        </h2>
        <p className="text-gray-400 mb-6">
          Bu özelliği kullanmak için Pro üyelik gereklidir.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg"
          >
            Kapat
          </button>
          <button
            onClick={() => {
              // Apple/Google subscription flow
              window.open('/subscribe', '_blank');
            }}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Pro'ya Geç
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Implementation Checklist

### Phase 1: Database & API (1-2 gün)
- [ ] Database schema güncelle (trial fields)
- [ ] `utils/premium.ts` oluştur
- [ ] `app/api/user/plan/route.ts` oluştur
- [ ] `app/api/subscription/webhook/route.ts` oluştur

### Phase 2: UI Restrictions (2-3 gün)
- [ ] AGGR içeriği premium kontrolü
- [ ] Upgrade modal component
- [ ] Layout kontrolü (4-9)
- [ ] Timeframe kontrolü (10s, 30s)
- [ ] User plan state management

### Phase 3: Backend Integration (1-2 gün)
- [ ] Otomatik fiyat takibi premium kontrolü
- [ ] Monthly subscription check cron job
- [ ] Apple/Google subscription webhook handler

### Phase 4: Testing (1 gün)
- [ ] Free kullanıcı testi
- [ ] Premium kullanıcı testi
- [ ] Trial kullanıcı testi
- [ ] Subscription webhook testi

---

## ✅ Sonuç

**Tüm özellikler MÜMKÜN ve net bir şekilde implement edilebilir!**

1. ✅ Trial başlangıcı - Ödeme yapıldığında
2. ✅ Premium geçiş - Ödeme kontrolü, aylık check
3. ✅ Backend servis - Premium kontrolü
4. ✅ Admin broadcast - Herkese gider (premium kontrolü yok)
5. ✅ Timeframe - 10s/30s premium only
6. ✅ AGGR menüsü - Görünür ama içerik premium only

**Hazır! Hangi özellikle başlamak istersiniz?** 🚀

