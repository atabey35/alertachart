# 🔧 Entitlement Sync Fix - Xcode Rebuild Gerekli

## Sorun

Log'larda `checkEntitlements` method'u görünmüyor ve `[Entitlement Sync]` log'ları yok.

## Çözüm Adımları

### 1. Xcode'da Rebuild

```bash
# 1. Xcode'u kapat
# 2. Terminal'de sync yap (zaten yaptık)
cd /Users/ata/Desktop/alertachart
npx cap sync ios

# 3. Xcode'u aç
npx cap open ios
```

**Xcode'da:**
1. **Product** → **Clean Build Folder** (⇧⌘K)
2. **Product** → **Build** (⌘B)
3. **Product** → **Run** (⌘R)

### 2. Console'da Kontrol Et

Uygulama açıldıktan sonra console'da şu log'ları ara:

```
[App] 🔧 Setting up automatic entitlement sync...
[Entitlement Sync] 🔧 Setting up automatic entitlement sync...
[Entitlement Sync] 🔄 Starting entitlement sync...
```

**Eğer bu log'lar görünmüyorsa:**

Console'da manuel test:
```javascript
// Platform kontrolü
console.log('Platform:', window.Capacitor?.getPlatform());

// IAP Plugin kontrolü
console.log('IAP Plugin:', window.Capacitor?.Plugins?.InAppPurchase);

// checkEntitlements method kontrolü
const plugin = window.Capacitor.Plugins.InAppPurchase;
console.log('checkEntitlements exists:', typeof plugin.checkEntitlements === 'function');
```

### 3. Manuel Sync Test

Console'da:
```javascript
// Manuel sync tetikle
import { syncEntitlements } from '@/services/entitlementSyncService';
syncEntitlements().then(result => {
  console.log('Sync result:', result);
});
```

### 4. Beklenen Log Sırası

Başarılı bir sync'te şu log'lar görünmeli:

```
1. [App] 🔧 Setting up automatic entitlement sync...
2. [Entitlement Sync] 🔧 Setting up automatic entitlement sync...
3. [Entitlement Sync] 🔄 Starting entitlement sync... (2 saniye sonra)
4. [Entitlement Sync] 📱 Checking entitlements from native plugin...
5. [InAppPurchase] checkEntitlements: Checking current receipt...
6. [InAppPurchase] checkEntitlements: ✅ Receipt found (length: XXXX)
7. [Entitlement Sync] 🔄 Validating receipt with backend...
8. [Entitlement Sync] ✅ Premium activated via sync!
```

## Debug Checklist

- [ ] Xcode'da Clean Build yapıldı mı?
- [ ] Xcode'da Rebuild yapıldı mı?
- [ ] `checkEntitlements` method'u plugin'de görünüyor mu?
- [ ] `[App] 🔧 Setting up automatic entitlement sync...` log'u görünüyor mu?
- [ ] Platform iOS olarak algılanıyor mu?

## Hızlı Test

Xcode Console'da:
```javascript
// 1. Platform kontrolü
window.Capacitor?.getPlatform() // "ios" dönmeli

// 2. Plugin kontrolü
window.Capacitor?.Plugins?.InAppPurchase // object dönmeli

// 3. Method kontrolü
window.Capacitor?.Plugins?.InAppPurchase?.checkEntitlements // function dönmeli

// 4. Manuel çağırma
window.Capacitor.Plugins.InAppPurchase.checkEntitlements().then(r => console.log(r))
```

