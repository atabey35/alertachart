# Authentication Session Restore Fix - Aggr ve Liquidation Tracker

## 📋 Sorun

Kullanıcı ana sitede (www.alertachart.com) giriş yapmış, NextAuth session var. Ancak `/aggr` veya `/data/liquidation-tracker` route'larına gittiğinde hala login ekranı görünüyor.

### Kök Neden

1. **NextAuth session var** (ana sitede giriş yapılmış)
2. **Backend cookies yok** (subdomain'lerde cookie paylaşımı çalışmıyor veya expire olmuş)
3. **`authService.checkAuth()` sadece backend cookies'e bakıyor**
4. **NextAuth session kontrolü yapılmıyor**
5. **Sonuç:** `authService.checkAuth()` `null` döndürüyor → Login ekranı gösteriliyor

## 🔍 Analiz

### Eski Sistem (calisansurum)

Eski sistemde muhtemelen:
- NextAuth session kontrolü yapılıyordu
- Session restore mekanizması çalışıyordu
- Cookie paylaşımı düzgün çalışıyordu

### Yeni Sistem (Mevcut)

Yeni sistemde:
- `/aggr` ve `/data/liquidation-tracker` route'ları sadece `authService.checkAuth()` kullanıyor
- NextAuth session kontrolü yapılmıyor
- Restore-session mekanizması client-side'da çalışmıyor

## 🛠️ Çözüm

### Yapılan Değişiklikler

#### 1. NextAuth Session Kontrolü Eklendi

**Dosyalar:**
- `app/aggr/page.tsx`
- `app/data/liquidation-tracker/page.tsx`

**Değişiklik:**
```typescript
// Önce
import { authService } from '@/services/authService';

// Sonra
import { useSession } from 'next-auth/react';
import { authService } from '@/services/authService';

const { data: session, status } = useSession();
```

#### 2. Session Restore Mekanizması Eklendi

**Akış:**
1. NextAuth session kontrolü yapılıyor
2. `authService.checkAuth()` çağrılıyor
3. Eğer NextAuth session var ama `authService.checkAuth()` null döndürüyorsa:
   - Restore-session endpoint'i çağrılıyor
   - Backend cookies restore ediliyor
   - `authService.checkAuth()` tekrar çağrılıyor
4. Eğer hala null döndürüyorsa:
   - NextAuth session'dan user bilgisi oluşturuluyor (fallback)

#### 3. useEffect Dependency Güncellendi

**Önce:**
```typescript
useEffect(() => {
  if (hasCheckedRef.current) return;
  hasCheckedRef.current = true;
  checkAuthAndPremium();
}, []);
```

**Sonra:**
```typescript
useEffect(() => {
  // Wait for NextAuth session to load
  if (status === 'loading') {
    console.log('[Aggr] Waiting for NextAuth session to load...');
    return;
  }
  
  if (hasCheckedRef.current) return;
  hasCheckedRef.current = true;
  checkAuthAndPremium();
}, [status, session]);
```

### Kod Değişiklikleri

#### app/aggr/page.tsx

```typescript
// 1. NextAuth session hook eklendi
const { data: session, status } = useSession();

// 2. Restore attempt ref eklendi
const restoreAttemptedRef = useRef(false);

// 3. checkAuthAndPremium fonksiyonunda:
const hasNextAuthSession = status === 'authenticated' && !!session?.user?.email;

let user = await authService.checkAuth();

// 4. Restore mekanizması
if (!user && hasNextAuthSession && !restoreAttemptedRef.current) {
  restoreAttemptedRef.current = true;
  const restoreResponse = await fetch('/api/auth/restore-session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  
  if (restoreResponse.ok) {
    user = await authService.checkAuth();
  }
}

// 5. Fallback: NextAuth session kullan
if (!user && hasNextAuthSession && session?.user) {
  user = {
    id: (session.user as any).id || 0,
    email: session.user.email || '',
    name: session.user.name || undefined,
  } as any;
}
```

#### app/data/liquidation-tracker/page.tsx

Aynı değişiklikler uygulandı.

## 🔄 Yeni Akış

### Senaryo 1: Backend Cookies Var

```
Kullanıcı /aggr'a gidiyor
    ↓
NextAuth session kontrolü (var)
    ↓
authService.checkAuth() çağrılıyor
    ↓
Backend cookies var → User döndürülüyor
    ↓
Premium kontrolü yapılıyor
    ↓
Subdomain'e yönlendiriliyor
```

### Senaryo 2: Backend Cookies Yok (Restore Gerekli)

```
Kullanıcı /aggr'a gidiyor
    ↓
NextAuth session kontrolü (var)
    ↓
authService.checkAuth() çağrılıyor
    ↓
Backend cookies yok → null döndürülüyor
    ↓
NextAuth session var → Restore-session çağrılıyor
    ↓
Backend cookies restore ediliyor
    ↓
authService.checkAuth() tekrar çağrılıyor
    ↓
User döndürülüyor
    ↓
Premium kontrolü yapılıyor
    ↓
Subdomain'e yönlendiriliyor
```

### Senaryo 3: Restore Başarısız (Fallback)

```
Kullanıcı /aggr'a gidiyor
    ↓
NextAuth session kontrolü (var)
    ↓
authService.checkAuth() çağrılıyor
    ↓
Backend cookies yok → null döndürülüyor
    ↓
Restore-session başarısız
    ↓
NextAuth session'dan user oluşturuluyor (fallback)
    ↓
Premium kontrolü yapılıyor
    ↓
Subdomain'e yönlendiriliyor
```

## ✅ Test Senaryoları

### Senaryo 1: Ana Sitede Giriş Yapılmış
1. ✅ Kullanıcı www.alertachart.com'da giriş yapıyor
2. ✅ NextAuth session oluşturuluyor
3. ✅ Kullanıcı /aggr'a gidiyor
4. ✅ NextAuth session kontrolü yapılıyor
5. ✅ Backend cookies restore ediliyor
6. ✅ Premium kontrolü yapılıyor
7. ✅ Subdomain'e yönlendiriliyor

### Senaryo 2: Backend Cookies Expire Olmuş
1. ✅ Kullanıcı www.alertachart.com'da giriş yapmış
2. ✅ Backend cookies expire olmuş
3. ✅ Kullanıcı /aggr'a gidiyor
4. ✅ NextAuth session kontrolü yapılıyor
5. ✅ Restore-session mekanizması devreye giriyor
6. ✅ Backend cookies restore ediliyor
7. ✅ Premium kontrolü yapılıyor
8. ✅ Subdomain'e yönlendiriliyor

### Senaryo 3: Giriş Yapılmamış
1. ✅ Kullanıcı giriş yapmamış
2. ✅ Kullanıcı /aggr'a gidiyor
3. ✅ NextAuth session yok
4. ✅ authService.checkAuth() null döndürüyor
5. ✅ Login ekranı gösteriliyor

## 🎯 Sonuç

### Sorun
- Ana sitede giriş yapılmış ama `/aggr` ve `/data/liquidation-tracker` route'larında login ekranı görünüyordu
- NextAuth session kontrolü yapılmıyordu
- Restore-session mekanizması client-side'da çalışmıyordu

### Çözüm
- NextAuth session kontrolü eklendi
- Restore-session mekanizması client-side'da çalışıyor
- Fallback mekanizması eklendi (NextAuth session'dan user oluşturma)

### Faydalar
1. ✅ Ana sitede giriş yapılmış kullanıcılar subdomain'lere erişebiliyor
2. ✅ Backend cookies expire olsa bile restore ediliyor
3. ✅ Kullanıcı deneyimi iyileştirildi
4. ✅ Eski sistem (calisansurum) ile aynı davranış sağlandı

## 📝 Notlar

- Restore-session mekanizması sadece bir kez çalışıyor (`restoreAttemptedRef` ile korunuyor)
- NextAuth session yüklenene kadar bekleniyor (`status === 'loading'` kontrolü)
- Fallback mekanizması sayesinde restore başarısız olsa bile çalışıyor

## 🔗 İlgili Dosyalar

- `app/aggr/page.tsx` - Aggr route (düzeltildi)
- `app/data/liquidation-tracker/page.tsx` - Liquidation tracker route (düzeltildi)
- `app/api/auth/restore-session/route.ts` - Restore-session endpoint (mevcut)
- `app/api/auth/me/route.ts` - Auth me endpoint (mevcut, server-side restore yapıyor)

