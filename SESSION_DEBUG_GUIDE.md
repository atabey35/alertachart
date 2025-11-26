# 🔍 Session Debug Rehberi - Premium Özellikler Açılmıyor

## ❌ Sorun: API `free` plan döndürüyor

**API Response:**
```json
{
  "plan": "free",
  "isPremium": false,
  "hasPremiumAccess": false
}
```

**Neden:** Session'da email yok veya session expire olmuş.

---

## 🔍 Debug Adımları

### 1. Browser Console'da Session Kontrolü

**Console'da çalıştır:**
```javascript
// Session'ı kontrol et
fetch('/api/auth/session')
  .then(r => r.json())
  .then(session => {
    console.log('📊 Session:', session);
    console.log('📧 Email:', session?.user?.email);
    console.log('👤 User:', session?.user);
    console.log('🔑 Has Session:', !!session);
  });
```

**Beklenen:**
```json
{
  "user": {
    "email": "kriptokirmizi@gmail.com",
    "name": "Kripto Kırmızı",
    "id": 139,
    "plan": "premium",
    "isPremium": true,
    "hasPremiumAccess": true
  }
}
```

**Eğer `user: null` veya `email: null` ise:**
- Session expire olmuş
- Logout/login yapman gerekiyor

---

### 2. Logout/Login Yap

**Adımlar:**
1. **Logout** butonuna tıkla
2. **Login** butonuna tıkla
3. Google ile giriş yap (`kriptokirmizi@gmail.com`)
4. Sayfayı yenile (F5)

**Sonra tekrar test et:**
```javascript
fetch('/api/user/plan?t=' + Date.now())
  .then(r => r.json())
  .then(data => console.log('Premium Status:', data));
```

---

### 3. Session Restore Endpoint'ini Kullan

Eğer session yoksa, restore endpoint'ini kullan:

**Console'da:**
```javascript
// Session restore
fetch('/api/auth/restore-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'kriptokirmizi@gmail.com'
  })
})
  .then(r => r.json())
  .then(data => {
    console.log('Restore Result:', data);
    // Sayfayı yenile
    window.location.reload();
  });
```

---

### 4. Database'de Email Kontrolü

Railway PostgreSQL'de email kontrolü:
```sql
SELECT id, email, plan, expiry_date, provider, provider_user_id 
FROM users 
WHERE email = 'kriptokirmizi@gmail.com';
```

**Beklenen:**
- `plan`: `premium`
- `expiry_date`: `2026-11-26` (veya daha sonra)

---

## 🔧 Hızlı Çözüm

### Yöntem 1: Hard Refresh
1. **Ctrl+Shift+R** (Windows) veya **Cmd+Shift+R** (Mac) - Hard refresh
2. Cache temizlenir, session yenilenir

### Yöntem 2: Logout/Login
1. Logout yap
2. Login yap (`kriptokirmizi@gmail.com`)
3. Premium özellikler açılmalı

### Yöntem 3: Incognito/Private Window
1. Yeni incognito/private window aç
2. `www.alertachart.com`'a git
3. Login yap
4. Premium özellikler test et

---

## 📊 Session Durumu Kontrolü

**Console'da çalıştır:**
```javascript
// Tüm session bilgileri
Promise.all([
  fetch('/api/auth/session').then(r => r.json()),
  fetch('/api/user/plan?t=' + Date.now()).then(r => r.json())
]).then(([session, plan]) => {
  console.log('📊 Session:', session);
  console.log('📊 Plan:', plan);
  console.log('');
  console.log('🔍 Analysis:');
  console.log('  Has Session:', !!session?.user);
  console.log('  Email:', session?.user?.email || 'MISSING');
  console.log('  Plan from Session:', session?.user?.plan || 'MISSING');
  console.log('  Plan from API:', plan.plan);
  console.log('  Has Premium Access:', plan.hasPremiumAccess);
  
  if (!session?.user?.email) {
    console.log('');
    console.log('❌ PROBLEM: Session\'da email yok!');
    console.log('💡 Solution: Logout/Login yap');
  } else if (plan.plan !== 'premium') {
    console.log('');
    console.log('❌ PROBLEM: API premium döndürmüyor!');
    console.log('💡 Solution: Database\'de plan kontrol et');
  } else {
    console.log('');
    console.log('✅ Her şey doğru görünüyor!');
  }
});
```

---

## 🎯 Sonuç

**Eğer session'da email yoksa:**
1. Logout/Login yap
2. Session yenilenecek
3. Premium özellikler açılacak

**Eğer session'da email varsa ama API hala `free` döndürüyorsa:**
1. Database'de email kontrol et
2. Vercel'de `DATABASE_URL` Railway PostgreSQL'e güncellenmiş mi kontrol et
3. Vercel'de redeploy yap

---

**Not**: API endpoint log ekledim. Vercel'de deploy olduktan sonra server logs'da session durumunu görebilirsin.

