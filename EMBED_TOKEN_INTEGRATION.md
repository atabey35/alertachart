# AGGR ve kkterminal Projelerine Token Doğrulama Ekleme Rehberi

## Güvenlik Açığı Düzeltmesi

`embed=true` parametresi güvenlik açığına neden oluyordu. Artık bu parametre **middleware tarafından engelleniyor** ve yerine güvenli token sistemi kullanılıyor.

## AlertaChart Tarafında Yapılan Değişiklikler

1. **lib/embedToken.ts** - Token oluşturma ve doğrulama utility'si
2. **api/embed/generate-token** - Premium kullanıcılar için token oluşturma
3. **api/embed/verify-token** - Token doğrulama (CORS destekli)
4. **middleware.ts** - `embed=true` engelleme, `token` parametresine izin verme
5. **app/aggr/page.tsx** ve **app/data/liquidation-tracker/page.tsx** - Token ile redirect

---

## AGGR Projesine (Vue.js) Eklenecek Kod

### 1. Token Doğrulama Fonksiyonu (örn: `src/utils/tokenAuth.js`)

```javascript
// Token doğrulama API'si
const VERIFY_TOKEN_URL = 'https://www.alertachart.com/api/embed/verify-token';

/**
 * URL'den token parametresini al ve doğrula
 * @returns {Promise<{valid: boolean, userId?: number, email?: string, error?: string}>}
 */
export async function verifyEmbedToken() {
  try {
    // URL'den token parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      console.log('[TokenAuth] No token in URL');
      return { valid: false, error: 'NO_TOKEN' };
    }
    
    // Token'ı doğrula
    const response = await fetch(VERIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token,
        type: 'aggr' // AGGR için 'aggr', Liquidation için 'liquidation'
      }),
    });
    
    const data = await response.json();
    
    if (data.valid) {
      console.log('[TokenAuth] ✅ Token verified:', {
        userId: data.userId,
        email: data.email,
        remainingSeconds: data.remainingSeconds,
      });
      
      // Token doğrulandı - kullanıcı bilgilerini sakla
      sessionStorage.setItem('embed_user', JSON.stringify({
        userId: data.userId,
        email: data.email,
        verifiedAt: Date.now(),
        expiresIn: data.remainingSeconds,
      }));
      
      return { 
        valid: true, 
        userId: data.userId, 
        email: data.email,
        remainingSeconds: data.remainingSeconds,
      };
    } else {
      console.log('[TokenAuth] ❌ Token invalid:', data.error);
      return { valid: false, error: data.error };
    }
    
  } catch (error) {
    console.error('[TokenAuth] ❌ Verification failed:', error);
    return { valid: false, error: 'NETWORK_ERROR' };
  }
}

/**
 * Kullanıcıyı login sayfasına yönlendir
 */
export function redirectToLogin() {
  window.location.replace('https://www.alertachart.com/?login=true');
}

/**
 * Kullanıcıyı upgrade sayfasına yönlendir
 */
export function redirectToUpgrade() {
  window.location.replace('https://www.alertachart.com/?upgrade=true');
}
```

### 2. App.vue veya main.js'de Kullanım

```javascript
import { verifyEmbedToken, redirectToLogin } from '@/utils/tokenAuth';

// Uygulama başlatılmadan önce token kontrolü yap
async function initApp() {
  const result = await verifyEmbedToken();
  
  if (!result.valid) {
    // Token geçersiz - login sayfasına yönlendir
    redirectToLogin();
    return;
  }
  
  // Token geçerli - uygulamayı başlat
  console.log('[App] ✅ User verified:', result.email);
  
  // Vue app'i mount et
  createApp(App).mount('#app');
}

initApp();
```

### 3. Vue Router Guard (Alternatif)

```javascript
// router/index.js
import { verifyEmbedToken, redirectToLogin } from '@/utils/tokenAuth';

router.beforeEach(async (to, from, next) => {
  // Zaten doğrulanmış mı kontrol et
  const cachedUser = sessionStorage.getItem('embed_user');
  if (cachedUser) {
    const user = JSON.parse(cachedUser);
    const elapsed = (Date.now() - user.verifiedAt) / 1000;
    
    // Token hala geçerli mi?
    if (elapsed < user.expiresIn) {
      return next();
    }
  }
  
  // Token doğrula
  const result = await verifyEmbedToken();
  
  if (!result.valid) {
    redirectToLogin();
    return;
  }
  
  next();
});
```

---

## kkterminal Projesine Eklenecek Kod

Aynı kod, sadece `type` parametresi `'liquidation'` olmalı:

```javascript
const response = await fetch(VERIFY_TOKEN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    token,
    type: 'liquidation' // kkterminal için 'liquidation'
  }),
});
```

---

## Token Sistemi Nasıl Çalışır

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Kullanıcı AGGR'e erişmek ister                                       │
│ 2. AlertaChart premium kontrolü yapar                                   │
│ 3. Premium ise: 5 dakika geçerli signed token üretir                   │
│ 4. Redirect: aggr.alertachart.com?token=xxxx                           │
│ 5. AGGR uygulaması /api/embed/verify-token'a POST atar                 │
│ 6. Token geçerliyse içerik gösterilir                                  │
│ 7. Token geçersiz/süresi dolmuş ise login sayfasına yönlendirilir      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Token Özellikleri

- **Süre:** 5 dakika (300 saniye)
- **İmza:** HMAC-SHA256 ile imzalı
- **İçerik:** userId, email, type (aggr/liquidation), iat, exp, nonce
- **Double-check:** API çağrısında veritabanından premium durumu tekrar kontrol edilir

## Güvenlik Kazanımları

1. ✅ `embed=true` artık çalışmıyor (middleware engelliyor)
2. ✅ Token sadece 5 dakika geçerli
3. ✅ Her token benzersiz (nonce ile)
4. ✅ Token'ı paylaşsan bile, doğrulama sırasında premium kontrol ediliyor
5. ✅ Time-safe signature karşılaştırması (timing attack koruması)

---

## Test Etme

### 1. Eski yöntem (artık çalışmamalı):
```
https://aggr.alertachart.com/?embed=true
→ www.alertachart.com/?login=true'e yönlendirilmeli
```

### 2. Geçersiz token:
```
https://aggr.alertachart.com/?token=invalid
→ AGGR uygulaması login'e yönlendirmeli
```

### 3. Geçerli token (premium kullanıcı):
```
www.alertachart.com'dan premium kullanıcı AGGR'e girerse
→ Token üretilir ve AGGR açılır
```
