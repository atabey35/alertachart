# Google OAuth 403 Hatası Çözümü

## 🔴 Sorun
PC'de Google ile giriş yaparken 403 hatası alınıyor:
```
Failed to load resource: the server responded with a status of 403
https://accounts.google.com/gsi/status?client_id=776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com
```

## 🔍 Neden
Google Cloud Console'da Web client ID için **Authorized JavaScript origins** ve **Authorized redirect URIs** eksik veya yanlış yapılandırılmış.

## ✅ Çözüm: Google Cloud Console'da Domain Ekleme

### 1. Google Cloud Console'a Giriş
1. [Google Cloud Console](https://console.cloud.google.com/) → Giriş yapın
2. Projenizi seçin (Project ID: `776781271347`)

### 2. OAuth 2.0 Client ID'yi Bulun
1. Sol menüden **APIs & Services** → **Credentials** seçin
2. **OAuth 2.0 Client IDs** listesinde **Web client** bulun
3. Client ID: `776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com`
4. Bu client ID'ye tıklayın (düzenlemek için)

### 3. Authorized JavaScript Origins Ekleme
**Authorized JavaScript origins** bölümüne şunları ekleyin:
```
https://alertachart.com
https://www.alertachart.com
https://data.alertachart.com
```

**Önemli:**
- `http://` değil, `https://` kullanın
- Trailing slash (`/`) eklemeyin
- Her domain'i ayrı satırda ekleyin

### 4. Authorized Redirect URIs Ekleme
**Authorized redirect URIs** bölümüne şunları ekleyin:
```
https://alertachart.com/api/auth/callback/google
https://www.alertachart.com/api/auth/callback/google
https://data.alertachart.com/api/auth/callback/google
```

**Önemli:**
- NextAuth otomatik olarak `/api/auth/callback/google` endpoint'ini kullanır
- Her domain için ayrı callback URL ekleyin
- Trailing slash eklemeyin

### 5. Kaydetme
1. **Save** butonuna tıklayın
2. Değişiklikler genellikle **1-2 dakika** içinde aktif olur
3. Bazen **5-10 dakika** sürebilir

### 6. Test
1. Tarayıcı cache'ini temizleyin (Ctrl+Shift+Delete veya Cmd+Shift+Delete)
2. `https://alertachart.com` adresine gidin
3. Google ile giriş yapmayı deneyin
4. Artık 403 hatası almamalısınız

## 📋 Kontrol Listesi

- [ ] Google Cloud Console'da Web client ID bulundu
- [ ] `https://alertachart.com` Authorized JavaScript origins'e eklendi
- [ ] `https://www.alertachart.com` Authorized JavaScript origins'e eklendi
- [ ] `https://data.alertachart.com` Authorized JavaScript origins'e eklendi
- [ ] `https://alertachart.com/api/auth/callback/google` Authorized redirect URIs'e eklendi
- [ ] `https://www.alertachart.com/api/auth/callback/google` Authorized redirect URIs'e eklendi
- [ ] `https://data.alertachart.com/api/auth/callback/google` Authorized redirect URIs'e eklendi
- [ ] Değişiklikler kaydedildi
- [ ] Tarayıcı cache temizlendi
- [ ] Test edildi ve çalışıyor

## ⚠️ Önemli Notlar

1. **Domain Değişikliği:** Eğer domain değiştirdiyseniz (ör. `alerta.kriptokirmizi.com` → `alertachart.com`), eski domain'i kaldırıp yeni domain'i ekleyin.

2. **Localhost:** Development için `http://localhost:3000` ve `http://localhost:3000/api/auth/callback/google` ekleyebilirsiniz.

3. **OAuth Consent Screen:** Eğer hala sorun varsa, **APIs & Services** → **OAuth consent screen** bölümünde domain'in ekli olduğundan emin olun.

4. **Client ID Kontrolü:** Kodda kullanılan client ID ile Google Cloud Console'daki client ID'nin aynı olduğundan emin olun:
   - Kod: `776781271347-ergb3kc3djjen47loq61icptau51rk4m.apps.googleusercontent.com`
   - Google Cloud Console: Aynı client ID olmalı

## 🔗 İlgili Dosyalar

- `app/page.tsx` - Google Sign-In button initialization
- `lib/authOptions.ts` - NextAuth Google provider configuration
- `components/login/DefaultLogin.tsx` - Web login component

## 🚀 Hızlı Çözüm

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client IDs
2. Web client ID'yi açın (`776781271347-ergb3kc3djjen47loq61icptau51rk4m`)
3. **Authorized JavaScript origins** → `https://alertachart.com`, `https://www.alertachart.com` ve `https://data.alertachart.com` ekleyin
4. **Authorized redirect URIs** → `https://alertachart.com/api/auth/callback/google`, `https://www.alertachart.com/api/auth/callback/google` ve `https://data.alertachart.com/api/auth/callback/google` ekleyin
5. **Save** → 2-5 dakika bekleyin → Test edin

