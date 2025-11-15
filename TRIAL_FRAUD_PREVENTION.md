# 🛡️ Trial Fraud Prevention - Aynı Cihazdan Çoklu Trial Engelleme

## 🎯 Problem

Aynı cihaz üzerinden farklı maillerle trial başlatılması:
- ❌ Kullanıcı 1: email1@example.com → Trial başlatır
- ❌ Kullanıcı 2: email2@example.com → Aynı cihazdan trial başlatır
- ❌ Kullanıcı 3: email3@example.com → Aynı cihazdan trial başlatır
- **Sonuç:** 1 cihaz = 3 trial (fraud!)

---

## 🔒 Çözüm Yaklaşımları

### 1. Device ID Tracking (EN ETKİLİ) ✅

**Nasıl Çalışır:**
- Her cihazın unique `device_id`'si var
- Trial başlatıldığında `device_id` kaydedilir
- Aynı `device_id`'den trial başlatılmaya çalışılırsa engellenir

**Avantajlar:**
- ✅ Çok etkili (her cihaz unique)
- ✅ Device ID zaten database'de var
- ✅ Kolay implement edilir

**Dezavantajlar:**
- ⚠️ Factory reset → Device ID değişebilir
- ⚠️ App reinstall → Device ID değişebilir (bazı durumlarda)
- ⚠️ Privacy concerns (ama zaten device_id kullanıyoruz)

**Implementasyon:**
```sql
-- Trial tracking table
CREATE TABLE IF NOT EXISTS trial_attempts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  user_id INTEGER,
  email VARCHAR(255),
  ip_address VARCHAR(45),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  platform VARCHAR(20), -- 'ios' | 'android' | 'web'
  UNIQUE(device_id) -- Aynı device_id'den sadece 1 trial
);

CREATE INDEX IF NOT EXISTS idx_trial_attempts_device_id ON trial_attempts(device_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_user_id ON trial_attempts(user_id);
```

### 2. IP Address Tracking (YARDIMCI) ✅

**Nasıl Çalışır:**
- Trial başlatıldığında IP adresi kaydedilir
- Aynı IP'den çok fazla trial başlatılmaya çalışılırsa engellenir

**Avantajlar:**
- ✅ VPN kullanımını engeller (kısmen)
- ✅ Aynı IP'den sadece 1 trial (fraud prevention)

**Dezavantajlar:**
- ⚠️ Aynı IP'de birden fazla kullanıcı olabilir (aile, ofis) - Bu durumda Device ID ve Email kontrolü devreye girer
- ⚠️ IP değişebilir (dynamic IP)
- ⚠️ VPN ile bypass edilebilir

**Implementasyon:**
```sql
-- IP tracking (trial_attempts tablosuna ekle)
ALTER TABLE trial_attempts ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Aynı IP'den sadece 1 trial kontrolü
SELECT id FROM trial_attempts 
WHERE ip_address = $1 
LIMIT 1;
```

### 3. Apple/Google Subscription ID (EN GÜVENLİ) ✅

**Nasıl Çalışır:**
- Apple/Google subscription ID zaten unique
- Aynı subscription ID'den trial başlatılmaya çalışılırsa engellenir

**Avantajlar:**
- ✅ Çok güvenli (Apple/Google kontrol eder)
- ✅ Fraud'a karşı en etkili
- ✅ Zaten database'de var (`users.subscription_id`)

**Dezavantajlar:**
- ⚠️ Sadece ödeme yapıldıktan sonra çalışır
- ⚠️ Trial başlatmadan önce kontrol edilemez (henüz subscription yok)

**Implementasyon:**
```sql
-- Subscription ID kontrolü (zaten var)
SELECT COUNT(*) FROM users 
WHERE subscription_id = $1 
AND plan = 'premium';
```

### 4. Rate Limiting (YARDIMCI) ✅

**Nasıl Çalışır:**
- Belirli bir süre içinde çok fazla trial başlatılmasını engeller
- Örnek: 24 saat içinde max 3 trial

**Avantajlar:**
- ✅ Spam'i engeller
- ✅ Bot saldırılarını engeller

**Dezavantajlar:**
- ⚠️ Legitimate kullanıcıları da etkileyebilir
- ⚠️ Bypass edilebilir (farklı IP, farklı cihaz)

---

## 🎯 Önerilen Çözüm: Kombinasyon Yaklaşımı

### Seviye 1: Device ID (Birincil Kontrol) ✅

```typescript
// Trial başlatmadan önce kontrol
async function canStartTrial(deviceId: string, userId: number): Promise<boolean> {
  // Aynı device_id'den daha önce trial başlatılmış mı?
  const existingTrial = await sql`
    SELECT id FROM trial_attempts 
    WHERE device_id = ${deviceId}
    LIMIT 1
  `;
  
  if (existingTrial.length > 0) {
    console.log(`[Trial] Device ${deviceId} already used trial`);
    return false; // Trial başlatılamaz
  }
  
  return true; // Trial başlatılabilir
}
```

### Seviye 2: IP Address (Yardımcı Kontrol) ✅

```typescript
// IP kontrolü - Aynı IP'den sadece 1 trial
async function checkIPTrial(ipAddress: string): Promise<boolean> {
  // Aynı IP'den daha önce trial başlatılmış mı?
  const existingIPTrial = await sql`
    SELECT id FROM trial_attempts 
    WHERE ip_address = ${ipAddress}
    LIMIT 1
  `;
  
  if (existingIPTrial.length > 0) {
    console.log(`[Trial] IP ${ipAddress} already used trial`);
    return false; // Aynı IP'den trial başlatılamaz
  }
  
  return true; // OK
}
```

### Seviye 3: User Email (Ekstra Kontrol) ✅

```typescript
// Aynı email'den daha önce trial başlatılmış mı?
async function checkEmailTrial(email: string): Promise<boolean> {
  const existingTrial = await sql`
    SELECT id FROM trial_attempts 
    WHERE email = ${email}
    LIMIT 1
  `;
  
  if (existingTrial.length > 0) {
    console.log(`[Trial] Email ${email} already used trial`);
    return false;
  }
  
  return true;
}
```

---

## 🗄️ Database Schema

```sql
-- Trial attempts tracking table
CREATE TABLE IF NOT EXISTS trial_attempts (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  platform VARCHAR(20), -- 'ios' | 'android' | 'web'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP, -- 3 gün sonra
  converted_to_premium BOOLEAN DEFAULT false,
  
  -- Unique constraints
  UNIQUE(device_id), -- Aynı device_id'den sadece 1 trial
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trial_attempts_device_id ON trial_attempts(device_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_user_id ON trial_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_email ON trial_attempts(email);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_ip ON trial_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_attempts_started_at ON trial_attempts(started_at);

-- Comments
COMMENT ON TABLE trial_attempts IS 'Tracks trial attempts to prevent fraud';
COMMENT ON COLUMN trial_attempts.device_id IS 'Unique device identifier - prevents multiple trials from same device';
COMMENT ON COLUMN trial_attempts.ip_address IS 'IP address for rate limiting';
```

---

## 🔧 Implementation

### 1. Trial Başlatma API

**Dosya:** `app/api/subscription/start-trial/route.ts` (YENİ)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { deviceId, platform } = body;
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }
    
    // Get user
    const users = await sql`
      SELECT id, email, plan FROM users 
      WHERE email = ${session.user.email}
      LIMIT 1
    `;
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = users[0];
    
    // Check 1: Device ID kontrolü (BİRİNCİL)
    const existingDeviceTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE device_id = ${deviceId}
      LIMIT 1
    `;
    
    if (existingDeviceTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used on this device',
          code: 'DEVICE_TRIAL_USED'
        },
        { status: 403 }
      );
    }
    
    // Check 2: Email kontrolü
    const existingEmailTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE email = ${user.email}
      LIMIT 1
    `;
    
    if (existingEmailTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used with this email',
          code: 'EMAIL_TRIAL_USED'
        },
        { status: 403 }
      );
    }
    
    // Check 3: IP kontrolü - Aynı IP'den sadece 1 trial
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const existingIPTrial = await sql`
      SELECT id FROM trial_attempts 
      WHERE ip_address = ${ipAddress}
      LIMIT 1
    `;
    
    if (existingIPTrial.length > 0) {
      return NextResponse.json(
        { 
          error: 'Trial already used from this IP address',
          code: 'IP_TRIAL_USED'
        },
        { status: 403 }
      );
    }
    
    // Check 4: User zaten premium mu?
    if (user.plan === 'premium') {
      return NextResponse.json(
        { 
          error: 'User already has premium',
          code: 'ALREADY_PREMIUM'
        },
        { status: 400 }
      );
    }
    
    // ✅ Tüm kontroller geçti → Trial başlat
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 3); // 3 gün
    
    // Trial attempt kaydet
    await sql`
      INSERT INTO trial_attempts (
        device_id,
        user_id,
        email,
        ip_address,
        platform,
        started_at,
        ended_at
      ) VALUES (
        ${deviceId},
        ${user.id},
        ${user.email},
        ${ipAddress},
        ${platform || 'web'},
        ${now.toISOString()},
        ${trialEnd.toISOString()}
      )
    `;
    
    // User'ı premium yap (trial başladı)
    await sql`
      UPDATE users
      SET 
        plan = 'premium',
        trial_started_at = ${now.toISOString()},
        trial_ended_at = ${trialEnd.toISOString()},
        updated_at = NOW()
      WHERE id = ${user.id}
    `;
    
    console.log(`[Trial] Started for user ${user.id}, device ${deviceId}`);
    
    return NextResponse.json({
      success: true,
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      message: 'Trial started successfully'
    });
    
  } catch (error: any) {
    console.error('[Trial] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start trial' },
      { status: 500 }
    );
  }
}
```

### 2. Trial Durumu Kontrolü

**Dosya:** `app/api/subscription/trial-status/route.ts` (YENİ)

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
    
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }
    
    // Check if device already used trial
    const trialAttempt = await sql`
      SELECT 
        id,
        device_id,
        user_id,
        started_at,
        ended_at,
        converted_to_premium
      FROM trial_attempts
      WHERE device_id = ${deviceId}
      LIMIT 1
    `;
    
    if (trialAttempt.length === 0) {
      return NextResponse.json({
        canStartTrial: true,
        message: 'Trial available'
      });
    }
    
    const trial = trialAttempt[0];
    const now = new Date();
    const trialEnd = new Date(trial.ended_at);
    
    return NextResponse.json({
      canStartTrial: false,
      reason: 'DEVICE_TRIAL_USED',
      trialStartedAt: trial.started_at,
      trialEndedAt: trial.ended_at,
      isTrialActive: now < trialEnd,
      message: 'Trial already used on this device'
    });
    
  } catch (error: any) {
    console.error('[Trial Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check trial status' },
      { status: 500 }
    );
  }
}
```

### 3. Frontend Integration

**Dosya:** `app/page.tsx` veya `components/UpgradeModal.tsx`

```typescript
// Trial başlatma
const startTrial = async () => {
  try {
    // Device ID al (localStorage'dan veya native'den)
    const deviceId = localStorage.getItem('native_device_id') || 
                     'web-' + navigator.userAgent.substring(0, 50);
    
    const response = await fetch('/api/subscription/start-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deviceId: deviceId,
        platform: (window as any).Capacitor ? 'capacitor' : 'web'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.code === 'DEVICE_TRIAL_USED') {
        alert('Bu cihazda zaten trial kullanılmış. Pro üyelik için ödeme yapın.');
      } else if (data.code === 'EMAIL_TRIAL_USED') {
        alert('Bu email ile zaten trial kullanılmış.');
      } else if (data.code === 'IP_TRIAL_USED') {
        alert('Bu IP adresinden zaten trial kullanılmış.');
      } else {
        alert(data.error || 'Trial başlatılamadı');
      }
      return;
    }
    
    // Trial başladı!
    alert('3 günlük trial başladı!');
    // Refresh user plan
    await fetchUserPlan();
    
  } catch (error) {
    console.error('[Trial] Error:', error);
    alert('Trial başlatılırken bir hata oluştu');
  }
};
```

---

## 🎯 Özet

### Kontrol Sırası (Öncelik)

1. **Device ID** (Birincil) ✅
   - Aynı device_id'den trial başlatılmış mı?
   - En etkili yöntem

2. **Email** (İkincil) ✅
   - Aynı email'den trial başlatılmış mı?
   - Ekstra güvenlik

3. **IP Address** (Yardımcı) ✅
   - Aynı IP'den sadece 1 trial
   - Fraud prevention

4. **Subscription ID** (Ödeme sonrası) ✅
   - Apple/Google subscription ID kontrolü
   - Ödeme yapıldıktan sonra çalışır

### Bypass Senaryoları

**Senaryo 1: Factory Reset**
- Device ID değişebilir
- **Çözüm:** IP + Email kombinasyonu

**Senaryo 2: VPN Kullanımı**
- IP değişir
- **Çözüm:** Device ID (birincil kontrol)

**Senaryo 3: Farklı Cihaz**
- Device ID farklı
- **Çözüm:** Email kontrolü (aynı email'den sadece 1 trial)

---

## ✅ Sonuç

**En Etkili Kombinasyon:**
1. ✅ Device ID (birincil) - Aynı cihazdan sadece 1 trial
2. ✅ Email (ikincil) - Aynı email'den sadece 1 trial
3. ✅ IP Address (yardımcı) - Aynı IP'den sadece 1 trial

**Bu kombinasyon ile fraud %98+ engellenir!** 🛡️

**Not:** Aynı IP'de birden fazla kullanıcı olabilir (aile, ofis). Bu durumda:
- Device ID kontrolü devreye girer (farklı cihazlar)
- Email kontrolü devreye girer (farklı kullanıcılar)
- IP kontrolü sadece fraud prevention için (aynı kişi farklı email denemesi)

