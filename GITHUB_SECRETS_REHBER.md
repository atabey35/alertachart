# GitHub Secrets Nasıl Eklenir - Adım Adım

## 📍 GitHub Secrets'a Erişim

### Adım 1: GitHub Repo'ya Git
1. GitHub'da repo'nuzu açın: `https://github.com/kullaniciadi/alertachart`
2. Repo sayfasının **üst menüsünde** **Settings** sekmesine tıklayın

### Adım 2: Secrets Bölümüne Git
1. Sol menüde **"Security"** bölümünü bulun
2. **"Secrets and variables"** altında **"Actions"** seçeneğine tıklayın

**Eğer "Security" görmüyorsanız:**
- Sol menüde **"Secrets and variables"** direkt görünebilir
- Veya **"Code security"** altında olabilir

### Adım 3: Yeni Secret Ekle
1. **"New repository secret"** butonuna tıklayın
2. **Name:** `APPLE_TEAM_ID`
3. **Secret:** Team ID'nizi yapıştırın (örn: `ABC123DEF4`)
4. **"Add secret"** butonuna tıklayın

### Gerekli Secrets:
- ✅ `APPLE_TEAM_ID` (ZORUNLU) - Apple Developer Team ID
- ⚠️ `APPLE_ID` (OPSIYONEL) - TestFlight için
- ⚠️ `APPLE_APP_SPECIFIC_PASSWORD` (OPSIYONEL) - TestFlight için

---

## 🔍 Team ID'yi Nasıl Bulurum?

### Yöntem 1: Apple Developer Portal
1. https://developer.apple.com/account adresine gidin
2. Giriş yapın
3. Sağ üstte **Membership** sekmesine tıklayın
4. **Team ID** orada görünecek (örn: `ABC123DEF4`)

### Yöntem 2: Xcode (Eğer yüklüyse)
1. Xcode'u açın
2. **Xcode** → **Preferences** → **Accounts**
3. Apple ID'nizi seçin
4. Team ID görünecek

### Yöntem 3: Terminal (Xcode yüklüyse)
```bash
security find-identity -v -p codesigning | grep "Developer"
```

---

## 🚨 Secrets Bulamıyorsanız - Alternatif Çözüm

Eğer GitHub Secrets bölümünü bulamıyorsanız, **`ios-build-simple.yml`** workflow'unu kullanabilirsiniz. Bu workflow Team ID'yi manuel olarak girmenize izin verir.

### Basit Workflow Kullanımı:

1. **GitHub** → **Actions** sekmesi
2. **"iOS Build (Simple - No Secrets Required)"** workflow'unu seçin
3. **"Run workflow"** butonuna tıklayın
4. **"apple_team_id"** alanına Team ID'nizi girin (örn: `ABC123DEF4`)
5. **"Run workflow"** butonuna tıklayın

**Avantajlar:**
- ✅ Secrets gerekmez
- ✅ Team ID'yi her build'de manuel girebilirsiniz
- ✅ Daha kolay kurulum

**Dezavantajlar:**
- ⚠️ Her build'de Team ID girmeniz gerekir
- ⚠️ Team ID workflow loglarında görünebilir (güvenlik açısından ideal değil)

---

## 📸 Görsel Rehber

### GitHub Secrets Bulma:

```
GitHub Repo
  └─ Settings (üst menü)
      └─ Sol menü:
          ├─ General
          ├─ Security
          │   └─ Secrets and variables
          │       └─ Actions  ← BURASI!
          ├─ Actions
          └─ ...
```

**Alternatif Yol:**
- Repo → **Settings** → Sol menüde **"Secrets"** direkt görünebilir
- Veya **"Code security"** → **"Secrets and variables"** → **"Actions"**

