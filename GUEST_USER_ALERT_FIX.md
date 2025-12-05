# Misafir Kullanıcı Alert Sorunu - Analiz ve Çözüm

## 🔍 Sorun Analizi

### Problem
Misafir kullanıcı ile giriş yapıldığında ve premium olduğunda:
1. ❌ Custom coin alert kurulamıyor
2. ❌ Otomatik fiyat takipleri gelmiyor

Google veya Apple ile giriş yapıldığında her şey kusursuz çalışıyor.

### Kök Neden

**Misafir kullanıcılar için cookie yok!**

1. **Google/Apple girişi:**
   - NextAuth.js session oluşturur
   - Backend'de JWT token cookie'leri set edilir
   - Backend cookie'den user'ı bulur ve premium kontrolü yapar
   - ✅ Alert oluşturma başarılı

2. **Misafir kullanıcı:**
   - Session yok (NextAuth.js kullanılmıyor)
   - Cookie yok (backend'de authentication yok)
   - Backend cookie'den user'ı bulamıyor
   - ❌ Premium kontrolü başarısız
   - ❌ Alert oluşturma başarısız

### Teknik Detaylar

**Frontend (Settings Page):**
- Misafir kullanıcı `localStorage`'da `guest_user` olarak saklanıyor
- Alert oluştururken sadece `deviceId` gönderiliyor
- Cookie gönderilmiyor (çünkü yok)

**Backend Proxy (`/app/api/alerts/price/route.ts`):**
- Cookie'leri backend'e forward ediyor
- Misafir kullanıcı için cookie yok
- Backend'e sadece `deviceId` gönderiliyor

**Backend (`alertachart-backend`):**
- Cookie'den user'ı bulmaya çalışıyor
- Cookie yoksa user bulunamıyor
- Premium kontrolü başarısız
- Alert oluşturma reddediliyor

---

## ✅ Çözüm

### 1. Frontend Değişiklikleri (Tamamlandı)

#### Settings Page (`app/settings/page.tsx`)
- Alert oluştururken misafir kullanıcı için `userEmail` de ekleniyor
- Backend'in `device_id`'den user'ı bulması için email sağlanıyor

```typescript
// Add user email for guest users (backend needs it to find user by device_id)
if (user && (user as any).provider === 'guest' && user.email) {
  requestBody.userEmail = user.email;
  console.log('[Settings] ✅ Adding user email for guest user:', user.email);
}
```

#### Backend Proxy (`app/api/alerts/price/route.ts`)
- Misafir kullanıcı için log mesajları eklendi
- `userEmail` backend'e gönderiliyor

---

### 2. Backend Değişiklikleri (Gerekli)

**⚠️ Backend kodu burada yok, bu yüzden backend'de yapılması gereken değişiklikler:**

#### A. Alert Oluşturma Endpoint (`/api/alerts/price` POST)

**Mevcut Kod (Tahmini):**
```javascript
// Cookie'den user'ı bul
const user = await getUserFromCookie(req);
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Premium kontrolü
if (!isPremium(user)) {
  return res.status(403).json({ error: 'Premium required' });
}
```

**Yeni Kod:**
```javascript
// 1. Önce cookie'den user'ı bul (normal kullanıcılar için)
let user = await getUserFromCookie(req);

// 2. Cookie yoksa ve userEmail varsa, device_id'den user'ı bul (misafir kullanıcılar için)
if (!user && req.body.userEmail && req.body.deviceId) {
  const sql = getSql();
  const users = await sql`
    SELECT * FROM users 
    WHERE email = ${req.body.userEmail} 
    AND device_id = ${req.body.deviceId}
    AND provider = 'guest'
    LIMIT 1
  `;
  
  if (users.length > 0) {
    user = users[0];
    console.log('[Alerts] ✅ Guest user found by device_id:', user.email);
  }
}

if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Premium kontrolü
if (!isPremium(user)) {
  return res.status(403).json({ error: 'Premium required' });
}

// Alert oluştururken user_id'yi de ekle
const alert = await sql`
  INSERT INTO price_alerts (device_id, user_id, symbol, target_price, proximity_delta, direction)
  VALUES (${req.body.deviceId}, ${user.id}, ${req.body.symbol}, ${req.body.targetPrice}, ${req.body.proximityDelta}, ${req.body.direction})
  RETURNING *
`;
```

#### B. Custom Alerts Yükleme Servisi (`loadCustomAlerts`)

**Mevcut Kod (Tahmini):**
```javascript
// Sadece user_id ile alert'leri çek
const alerts = await sql`
  SELECT * FROM price_alerts 
  WHERE user_id = ${userId} 
  AND is_active = true
`;
```

**Yeni Kod:**
```javascript
// Hem user_id hem de device_id ile alert'leri çek
// Misafir kullanıcılar için device_id kullanılabilir
const alerts = await sql`
  SELECT pa.*, d.user_id 
  FROM price_alerts pa
  LEFT JOIN devices d ON pa.device_id = d.device_id
  WHERE (pa.user_id = ${userId} OR d.user_id = ${userId} OR pa.device_id IN (
    SELECT device_id FROM users WHERE id = ${userId}
  ))
  AND pa.is_active = true
`;
```

**Alternatif (Daha Basit):**
```javascript
// Önce user'ın device_id'sini bul
const user = await sql`SELECT device_id FROM users WHERE id = ${userId} LIMIT 1`;

// Hem user_id hem de device_id ile alert'leri çek
const alerts = await sql`
  SELECT * FROM price_alerts 
  WHERE (user_id = ${userId} OR device_id = ${user[0]?.device_id})
  AND is_active = true
`;
```

#### C. Alert Listeleme Endpoint (`/api/alerts/price` GET)

**Mevcut Kod (Tahmini):**
```javascript
// Sadece device_id ile alert'leri çek
const alerts = await sql`
  SELECT * FROM price_alerts 
  WHERE device_id = ${deviceId} 
  AND is_active = true
`;
```

**Yeni Kod:**
```javascript
// device_id'den user'ı bul (misafir kullanıcılar için)
const user = await sql`
  SELECT id FROM users 
  WHERE device_id = ${deviceId} 
  AND provider = 'guest'
  LIMIT 1
`;

// Hem device_id hem de user_id ile alert'leri çek
const alerts = await sql`
  SELECT * FROM price_alerts 
  WHERE (device_id = ${deviceId} OR user_id = ${user[0]?.id})
  AND is_active = true
`;
```

---

## 🧪 Test Senaryoları

### Senaryo 1: Misafir Kullanıcı - Alert Oluşturma
1. Misafir kullanıcı olarak giriş yap
2. Premium'a yükselt
3. Settings → Custom Coin Alerts → Add Alert
4. ✅ Alert başarıyla oluşturulmalı

### Senaryo 2: Misafir Kullanıcı - Alert Listeleme
1. Misafir kullanıcı olarak giriş yap
2. Premium'a yükselt
3. Alert oluştur
4. Sayfayı yenile
5. ✅ Alert'ler görünmeli

### Senaryo 3: Misafir Kullanıcı - Otomatik Fiyat Takibi
1. Misafir kullanıcı olarak giriş yap
2. Premium'a yükselt
3. Alert oluştur
4. Fiyat hedefe yaklaşsın
5. ✅ Push notification gelmeli

### Senaryo 4: Google/Apple Kullanıcı - Karşılaştırma
1. Google/Apple ile giriş yap
2. Premium'a yükselt
3. Alert oluştur
4. ✅ Her şey çalışmalı (mevcut davranış)

---

## 📝 Notlar

1. **Backend Kodu:** Backend kodu burada yok (`alertachart-backend` repository'sinde)
2. **Database Schema:** `price_alerts` tablosunda hem `device_id` hem de `user_id` var
3. **Guest User Email:** Misafir kullanıcı email formatı: `guest_{deviceId}@alertachart.local`
4. **Device ID:** Misafir kullanıcılar için `device_id` users tablosunda saklanıyor

---

## 🔄 Sonraki Adımlar

1. ✅ Frontend değişiklikleri tamamlandı
2. ⏳ Backend değişiklikleri yapılmalı:
   - Alert oluşturma endpoint'i güncellenmeli
   - Custom alerts yükleme servisi güncellenmeli
   - Alert listeleme endpoint'i güncellenmeli
3. ⏳ Test edilmeli:
   - Misafir kullanıcı alert oluşturma
   - Misafir kullanıcı alert listeleme
   - Misafir kullanıcı otomatik fiyat takibi

---

## 🐛 Bilinen Sorunlar

1. **Backend'de device_id'den user bulma:** Backend'de `device_id`'den user'ı bulma kodu eksik
2. **Custom alerts yükleme:** Backend'de custom alerts yükleme servisi misafir kullanıcıları desteklemiyor
3. **Alert listeleme:** Backend'de alert listeleme endpoint'i misafir kullanıcıları desteklemiyor

---

## 📚 İlgili Dosyalar

- `app/settings/page.tsx` - Alert oluşturma frontend kodu
- `app/api/alerts/price/route.ts` - Backend proxy
- `app/api/auth/guest-login/route.ts` - Misafir kullanıcı girişi
- `database/auth-schema.sql` - Database schema
- `database/push-schema.sql` - Push notification schema

---

## ✅ Çözüm Özeti

**Frontend:** ✅ Tamamlandı
- Misafir kullanıcı için `userEmail` alert oluştururken gönderiliyor

**Backend:** ⏳ Yapılması Gerekiyor
- Alert oluşturma endpoint'i: `device_id`'den user bulma
- Custom alerts yükleme servisi: Misafir kullanıcı desteği
- Alert listeleme endpoint'i: Misafir kullanıcı desteği
