# TestFlight'tan Eski Build'leri Silme

## 🗑️ App Store Connect'ten Silme

### 1. App Store Connect'e Giriş
1. [App Store Connect](https://appstoreconnect.apple.com) → Giriş yapın
2. **My Apps** → **Alerta Chart** uygulamasını açın

### 2. TestFlight Sekmesi
1. **TestFlight** sekmesine gidin
2. **iOS Builds** bölümüne gidin

### 3. Build'leri Silme

#### Internal Testing Build'lerini Silme:
1. **Internal Testing** sekmesine gidin
2. Build listesinde silmek istediğiniz build'i bulun
3. Build'in yanındaki **"..."** (üç nokta) menüsüne tıklayın
4. **"Remove Build"** veya **"Delete"** seçeneğini seçin
5. Onaylayın

#### External Testing Build'lerini Silme:
1. **External Testing** sekmesine gidin
2. Build listesinde silmek istediğiniz build'i bulun
3. Build'in yanındaki **"..."** menüsüne tıklayın
4. **"Remove Build"** veya **"Delete"** seçeneğini seçin
5. Onaylayın

#### Tüm Build'leri Görme:
1. **iOS Builds** sekmesine gidin
2. Burada tüm build'leri görebilirsiniz
3. Her build'in yanında **"..."** menüsü var
4. **"Expire"** veya **"Delete"** seçeneği ile silebilirsiniz

## ⚠️ Önemli Notlar

### Build'leri Silme Kuralları:
- ✅ **Internal Testing:** Build'leri silebilirsiniz
- ✅ **External Testing:** Build'leri silebilirsiniz (eğer aktif değilse)
- ❌ **Aktif External Testing:** Aktif external testing'de kullanılan build'ler silinemez, önce testing'i durdurun
- ❌ **App Store Review:** App Store review'da olan build'ler silinemez

### Build Expire:
- Build'ler **90 gün** sonra otomatik olarak expire olur
- Expire olan build'ler otomatik olarak kaldırılır
- Manuel olarak expire edebilirsiniz

## 🔄 Toplu Silme

### Tüm Eski Build'leri Temizleme:
1. **iOS Builds** sekmesine gidin
2. Her build için:
   - Build'in yanındaki **"..."** menüsüne tıklayın
   - **"Expire"** veya **"Delete"** seçeneğini seçin
   - Onaylayın

### Sadece Belirli Versiyonları Silme:
1. **iOS Builds** sekmesine gidin
2. Filtreleme yaparak eski versiyonları bulun
3. Sadece eski versiyonları seçip silin

## 📱 TestFlight Uygulamasında

TestFlight uygulamasında build'ler otomatik olarak güncellenir:
- Silinen build'ler TestFlight uygulamasından da kaldırılır
- Kullanıcılar silinen build'lere erişemez

## 🎯 Önerilen Yaklaşım

### Sadece Son Build'i Tutun:
1. En son build'i (1.2.1 - 16) tutun
2. Diğer tüm eski build'leri silin
3. Bu şekilde karışıklık olmaz

### Veya Son 2-3 Build'i Tutun:
1. Son 2-3 build'i tutun (rollback için)
2. Daha eski build'leri silin

## 🆘 Sorun Giderme

### Build Silinemiyorsa:
- Build aktif bir testing'de kullanılıyor olabilir
- Önce testing'i durdurun, sonra silin
- App Store review'da olan build'ler silinemez

### Build Görünmüyorsa:
- Build expire olmuş olabilir
- Build processing durumunda olabilir
- Sayfayı yenileyin

## 📝 Notlar

- **Build Silme:** Build'ler silindikten sonra geri alınamaz
- **TestFlight Linkleri:** Silinen build'ler için TestFlight linkleri çalışmaz
- **Kullanıcılar:** Kullanıcılar silinen build'lere erişemez
- **Yeni Build:** Yeni build aldığınızda otomatik olarak TestFlight'a eklenir



