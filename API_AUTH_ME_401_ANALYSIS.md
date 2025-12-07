# `/api/auth/me` 401 Hatası Analizi

## 📋 Sorun

Console'da `/api/auth/me` endpoint'ine yapılan isteklerin **401 (Unauthorized)** hatası verdiği görülüyor.

## 🔍 Analiz

### 401 Hatası Ne Zaman Normal?

401 hatası şu durumlarda **normal** ve beklenen bir davranıştır:

1. **Kullanıcı giriş yapmamış:**
   - Kullanıcı henüz login olmamış
   - Session yok
   - Backend cookies yok
   - Bu durumda 401 döndürmesi normal

2. **Session süresi dolmuş:**
   - Kullanıcı uzun süre aktif olmamış
   - Session expire olmuş
   - Backend cookies expire olmuş

3. **Cookies silinmiş:**
   - Kullanıcı browser'da cookies'i temizlemiş
   - Private/Incognito mode kullanıyor
   - Browser cookies'i otomatik silmiş

### 401 Hatası Ne Zaman Sorun?

401 hatası şu durumlarda **sorun** olabilir:

1. **NextAuth session var ama backend 401 döndürüyor:**
   - Kullanıcı giriş yapmış (NextAuth session var)
   - Ancak backend cookies yok veya expire olmuş
   - Bu durumda restore-session mekanizması devreye girmeli

2. **Subdomain'lerde cookie paylaşımı çalışmıyor:**
   - `www.alertachart.com`'da giriş yapılmış
   - `data.alertachart.com` veya `aggr.alertachart.com`'da cookies yok
   - Bu durumda restore-session mekanizması devreye girmeli

## 🛠️ Mevcut Çözüm

### `/api/auth/me` Endpoint'i

**Dosya:** `app/api/auth/me/route.ts`

**Mevcut Davranış:**
1. NextAuth session kontrolü yapılıyor
2. Backend cookies kontrolü yapılıyor
3. Backend'e `/api/auth/me` isteği gönderiliyor
4. Eğer backend 401 döndürürse:
   - **NextAuth session varsa:** restore-session mekanizması devreye giriyor
   - **NextAuth session yoksa:** 401 response döndürülüyor (normal)

### Restore-Session Mekanizması

**Dosya:** `app/api/auth/restore-session/route.ts`

**İşlev:**
- NextAuth session'dan backend cookies oluşturuyor
- Subdomain'lerde cookie paylaşımını sağlıyor
- Session'ı restore ediyor

## 📊 Console'da Görünen 401 Hataları

### Senaryo 1: Normal Durum (Sorun Değil)

```
Kullanıcı giriş yapmamış
    ↓
/authService.checkAuth() çağrılıyor
    ↓
/api/auth/me endpoint'ine istek gönderiliyor
    ↓
Backend 401 döndürüyor (normal - kullanıcı giriş yapmamış)
    ↓
Console'da 401 hatası görünüyor
    ↓
authService null döndürüyor (normal)
```

**Sonuç:** Bu normal bir durum, sorun değil.

### Senaryo 2: Session Restore Gerekli

```
Kullanıcı giriş yapmış (NextAuth session var)
    ↓
/authService.checkAuth() çağrılıyor
    ↓
/api/auth/me endpoint'ine istek gönderiliyor
    ↓
Backend 401 döndürüyor (backend cookies yok)
    ↓
NextAuth session var → restore-session mekanizması devreye giriyor
    ↓
Backend cookies restore ediliyor
    ↓
/api/auth/me tekrar çağrılıyor (başarılı)
```

**Sonuç:** Restore-session mekanizması çalışıyor, sorun yok.

### Senaryo 3: Gerçek Sorun

```
Kullanıcı giriş yapmış (NextAuth session var)
    ↓
/authService.checkAuth() çağrılıyor
    ↓
/api/auth/me endpoint'ine istek gönderiliyor
    ↓
Backend 401 döndürüyor (backend cookies yok)
    ↓
NextAuth session var → restore-session mekanizması devreye giriyor
    ↓
Restore-session başarısız oluyor
    ↓
401 hatası kalıyor (SORUN!)
```

**Sonuç:** Bu gerçek bir sorun, restore-session mekanizması çalışmıyor.

## 🔧 Çözüm Önerileri

### 1. Console'da 401 Hatalarını Gizlemek (Önerilmez)

401 hatası browser console'unda görünüyor çünkü fetch() çağrısı başarısız oluyor. Bu hatayı gizlemek mümkün değil çünkü:
- Browser network tab'ında görünür
- Console'da görünür
- Bu normal bir HTTP response code'u

### 2. 401 Hatalarını Daha İyi Handle Etmek (Önerilir)

**Mevcut Kod:**
```typescript
// authService.ts
if (response.status === 401) {
  // 401 is normal when user is not logged in - don't log as error
  this.user = null;
  this.notifyListeners();
  return null;
}
```

**İyileştirme:**
- 401 hatası zaten normal handle ediliyor
- Console'da görünmesi normal (browser network tab'ı)
- Kullanıcı giriş yapmamışsa bu beklenen bir davranış

### 3. Restore-Session Mekanizmasını İyileştirmek

**Mevcut Kod:**
```typescript
// app/api/auth/me/route.ts
if (response.status === 401 && hasNextAuthSession && session?.user?.email) {
  // Restore backend session
  const restoreResponse = await fetch(restoreUrl, { ... });
  // ...
}
```

**İyileştirme:**
- Restore-session mekanizması zaten çalışıyor
- Eğer restore başarısız olursa, log'larda görünecek

## 📝 Sonuç

### 401 Hatası Normal mi?

**Evet, çoğu durumda normal:**
- Kullanıcı giriş yapmamışsa → Normal
- Session expire olmuşsa → Normal
- Cookies silinmişse → Normal

**Hayır, bazı durumlarda sorun:**
- NextAuth session var ama restore-session çalışmıyorsa → Sorun
- Subdomain'lerde cookie paylaşımı çalışmıyorsa → Sorun

### Ne Yapmalı?

1. **Eğer kullanıcı giriş yapmamışsa:**
   - 401 hatası normal, sorun değil
   - Kullanıcı login olmalı

2. **Eğer kullanıcı giriş yapmışsa ama hala 401 alıyorsa:**
   - Restore-session mekanizması çalışmalı
   - Eğer çalışmıyorsa, log'larda görünecek
   - Bu durumda gerçek bir sorun var

3. **Console'da 401 hatası görünmesi:**
   - Bu normal bir durum
   - Browser network tab'ında görünür
   - Kullanıcı giriş yapmamışsa beklenen bir davranış

## 🔗 İlgili Dosyalar

- `app/api/auth/me/route.ts` - `/api/auth/me` endpoint'i
- `app/api/auth/restore-session/route.ts` - Restore-session mekanizması
- `services/authService.ts` - Auth service (checkAuth fonksiyonu)

## 📊 Test Senaryoları

### Senaryo 1: Giriş Yapmamış Kullanıcı
1. ✅ Kullanıcı giriş yapmamış
2. ✅ `/api/auth/me` çağrılıyor
3. ✅ Backend 401 döndürüyor (normal)
4. ✅ Console'da 401 hatası görünüyor (normal)
5. ✅ authService null döndürüyor (normal)

### Senaryo 2: Giriş Yapmış Kullanıcı (Session Restore)
1. ✅ Kullanıcı giriş yapmış (NextAuth session var)
2. ✅ `/api/auth/me` çağrılıyor
3. ✅ Backend 401 döndürüyor (backend cookies yok)
4. ✅ Restore-session mekanizması devreye giriyor
5. ✅ Backend cookies restore ediliyor
6. ✅ `/api/auth/me` tekrar çağrılıyor (başarılı)

### Senaryo 3: Giriş Yapmış Kullanıcı (Restore Başarısız)
1. ✅ Kullanıcı giriş yapmış (NextAuth session var)
2. ✅ `/api/auth/me` çağrılıyor
3. ✅ Backend 401 döndürüyor (backend cookies yok)
4. ❌ Restore-session mekanizması başarısız oluyor
5. ❌ 401 hatası kalıyor (SORUN!)

## 🎯 Öneriler

1. **Console'da 401 hatası görünmesi normal:**
   - Kullanıcı giriş yapmamışsa beklenen bir davranış
   - Browser network tab'ında görünür
   - Bu bir sorun değil

2. **Eğer kullanıcı giriş yapmışsa ve hala 401 alıyorsa:**
   - Restore-session mekanizması çalışmalı
   - Log'larda restore-session sonuçları görünecek
   - Bu durumda gerçek bir sorun var

3. **401 hatasını gizlemek mümkün değil:**
   - Browser network tab'ında görünür
   - Console'da görünür
   - Bu normal bir HTTP response code'u

