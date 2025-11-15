# iOS Build - Hızlı Başlangıç (Secrets Olmadan)

## 🚀 En Kolay Yol: Basit Workflow

GitHub Secrets bulamıyorsanız, **basit workflow** kullanabilirsiniz.

### Adım 1: Team ID'yi Bul

1. https://developer.apple.com/account adresine gidin
2. Giriş yapın
3. **Membership** sekmesine tıklayın
4. **Team ID**'yi kopyalayın (örn: `ABC123DEF4`)

### Adım 2: Workflow'u Tetikle

1. GitHub repo → **Actions** sekmesi
2. Sol menüden **"iOS Build (Simple - No Secrets Required)"** seçin
3. **"Run workflow"** butonuna tıklayın
4. **"apple_team_id"** alanına Team ID'nizi yapıştırın
5. **"Run workflow"** butonuna tekrar tıklayın

### Adım 3: Build'i Bekle

- Build 10-20 dakika sürebilir
- **Actions** sayfasında ilerlemeyi takip edebilirsiniz

### Adım 4: IPA'yı İndir

1. Build tamamlandıktan sonra build'e tıklayın
2. **Artifacts** bölümünde **"ios-app"** dosyasını indirin
3. Zip'i açın, içinde `.ipa` dosyası var

---

## 🔧 GitHub Secrets Bulma (İleri Seviye)

Eğer daha sonra Secrets kullanmak isterseniz:

### Yol 1: Settings Menüsü
```
Repo → Settings (üst menü) → Security → Secrets and variables → Actions
```

### Yol 2: Direkt URL
```
https://github.com/KULLANICI_ADI/REPO_ADI/settings/secrets/actions
```

**KULLANICI_ADI** ve **REPO_ADI**'yi kendi bilgilerinizle değiştirin.

### Yol 3: Arama
1. Repo → Settings
2. Sol menüde **"Secrets"** kelimesini arayın
3. **"Secrets and variables"** → **"Actions"** seçin

---

## ⚠️ Önemli Notlar

### Apple Developer Hesabı Gerekli
- Ücretsiz Apple Developer hesabı yeterli (development build için)
- Team ID olmadan build alınamaz

### İlk Build Uzun Sürer
- İlk build 15-30 dakika sürebilir
- Sonraki build'ler daha hızlı (cache sayesinde)

### Signing Hataları
Eğer "code signing" hatası alırsanız:
- Team ID'nin doğru olduğundan emin olun
- Apple Developer hesabınızın aktif olduğundan emin olun
- Automatic signing çalışmıyorsa, manuel provisioning profile gerekebilir

---

## 🆘 Sorun Giderme

### "Team ID not found" hatası
- Team ID'yi tekrar kontrol edin
- Apple Developer portal'dan doğru Team ID'yi kopyalayın

### "No signing certificate" hatası
- Apple Developer hesabınızın aktif olduğundan emin olun
- İlk kez build alıyorsanız, Apple Developer portal'da certificate oluşturmanız gerekebilir

### Build başarısız
- GitHub Actions logs'unu kontrol edin
- Hata mesajını okuyun ve gerekli düzeltmeleri yapın

---

## 💡 İpucu

**İlk deneme için:**
- Basit workflow kullanın (secrets gerekmez)
- Team ID'yi manuel girin
- Build başarılı olursa, daha sonra Secrets kullanabilirsiniz

**Production için:**
- GitHub Secrets kullanın (daha güvenli)
- Team ID'yi secrets'a ekleyin
- Normal workflow'u kullanın

