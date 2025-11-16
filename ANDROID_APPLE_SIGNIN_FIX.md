# Android Apple Sign In "I.authorize is not a function" Düzeltmesi

## 🔍 Sorun

Android'de Apple Sign In yaparken şu hata alınıyordu:
```
I.authorize is not a function
```

## 🔎 Neden

Android'de Capacitor plugin'leri bazen `Capacitor.Plugins` üzerinden erişilmesi gerekiyor. Direct import çalışmayabilir.

## ✅ Yapılan Düzeltme

### AndroidLogin.tsx

Plugin'e erişim için iki yöntem deniyoruz:

1. **Yöntem 1: Capacitor.Plugins üzerinden** (Android için önerilen)
   ```typescript
   if (window.Capacitor?.Plugins?.SignInWithApple) {
     SignInWithApple = window.Capacitor.Plugins.SignInWithApple;
   }
   ```

2. **Yöntem 2: Direct import** (iOS için çalışıyor)
   ```typescript
   const pluginModule = await import('@capacitor-community/apple-sign-in');
   SignInWithApple = pluginModule.SignInWithApple;
   ```

### Plugin Kontrolü

Plugin'in düzgün yüklendiğini kontrol ediyoruz:
```typescript
if (!SignInWithApple || typeof SignInWithApple.authorize !== 'function') {
  throw new Error('Apple Sign-In plugin is not available or not properly initialized');
}
```

## 🔄 Test

1. Android cihazda uygulamayı açın
2. "Continue with Apple" butonuna basın
3. Console'da şu logları görmelisiniz:
   - `[AndroidLogin] ✅ Plugin found via Capacitor.Plugins` VEYA
   - `[AndroidLogin] ✅ Plugin found via direct import`
4. "I.authorize is not a function" hatası görünmemeli ✅

## 🐛 Hala Hata Alıyorsanız

### Kontrol Listesi:

1. **Plugin Register Edilmiş mi?**
   - `android/app/src/main/java/.../MainActivity.java` dosyasında:
   ```java
   registerPlugin(com.getcapacitor.community.applesignin.SignInWithApple.class);
   ```
   ✅ Bu satır olmalı

2. **Gradle Dependencies:**
   - `android/app/build.gradle` dosyasında:
   ```gradle
   implementation project(':capacitor-community-apple-sign-in')
   ```
   ✅ Bu satır olmalı

3. **Capacitor Sync:**
   ```bash
   npx cap sync android
   ```

4. **Clean Build:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

5. **Uygulamayı Yeniden Yükleyin:**
   - Eski uygulamayı silin
   - Yeni APK'yı yükleyin

## 📝 Notlar

- Android'de Apple Sign In Android 9+ (API 28+) destekleniyor
- Plugin'in düzgün çalışması için native tarafında register edilmesi gerekiyor
- JavaScript tarafında plugin'e erişim için `Capacitor.Plugins` kullanılabilir

