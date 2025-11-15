# 📱 iOS Mimari Dokümantasyonu - Alerta Chart

## 📋 İçindekiler

1. [Genel Mimari](#genel-mimari)
2. [Katmanlar](#katmanlar)
3. [Veri Akışı](#veri-akışı)
4. [Tasarım Kararları](#tasarım-kararları)
5. [Güvenlik ve İzinler](#güvenlik-ve-izinler)
6. [Build Süreci](#build-süreci)
7. [JavaScript ↔ Native İletişim](#javascript--native-iletişim)
8. [Özet](#özet)

---

## 🏗️ Genel Mimari

### Proje Yapısı

```
ios/App/
├── App/                          # Ana uygulama klasörü
│   ├── AppDelegate.swift         # Uygulama lifecycle yönetimi
│   ├── CustomBridgeViewController.swift  # WebView ve navigation kontrolü
│   ├── Info.plist               # Uygulama konfigürasyonu
│   ├── capacitor.config.json    # Capacitor iOS konfigürasyonu
│   ├── Plugins/                 # Custom plugin'ler
│   │   └── WebViewController/
│   │       ├── WebViewController.swift      # Swift plugin implementasyonu
│   │       └── WebViewControllerPlugin.m   # Objective-C bridging
│   ├── public/                  # Web assets (HTML, JS, CSS)
│   │   ├── index.html
│   │   ├── plugins.json         # Plugin auto-discovery
│   │   └── workers/             # Web Workers
│   └── Assets.xcassets/         # Görseller (icon, splash)
├── App.xcodeproj/               # Xcode proje dosyası
├── App.xcworkspace/             # CocoaPods workspace
├── Podfile                      # CocoaPods bağımlılıkları
└── Pods/                        # CocoaPods kütüphaneleri
```

---

## 🧩 Katmanlar

### Katman 1: Uygulama Lifecycle (AppDelegate)

**Dosya:** `App/AppDelegate.swift`

```swift
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate
```

#### Sorumluluklar

- ✅ Uygulama başlatma (`didFinishLaunchingWithOptions`)
- ✅ URL scheme handling (Google OAuth callback)
- ✅ Universal Links handling
- ✅ Lifecycle event'leri (background, foreground, terminate)

#### Özellikler

- **Capacitor 7 Otomatik Plugin Discovery:** Manuel plugin kaydı yok
- **ApplicationDelegateProxy:** Capacitor entegrasyonu için proxy pattern
- **Minimal Kod:** Sadece gerekli lifecycle metodları

#### Kod Örneği

```swift
func application(_ application: UIApplication, 
                didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Capacitor 7 uses automatic plugin discovery via packageClassList
    // WebViewController is registered automatically if it's in capacitor.config.json
    print("[AppDelegate] ✅ Application launching - plugins will be auto-discovered")
    return true
}

func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    // Google OAuth callback handling
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}
```

---

### Katman 2: WebView Bridge (CustomBridgeViewController)

**Dosya:** `App/CustomBridgeViewController.swift`

```swift
class CustomBridgeViewController: CAPBridgeViewController
```

#### Sorumluluklar

- ✅ WKWebView yönetimi
- ✅ Navigation policy kontrolü (Safari'ye yönlendirmeyi engelleme)
- ✅ JavaScript ↔ Native bridge
- ✅ Plugin lifecycle yönetimi

#### Önemli Özellikler

**1. Navigation Delegate Override:**

```swift
extension CustomBridgeViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, 
                 decidePolicyFor navigationAction: WKNavigationAction, 
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Tüm navigation'ları WebView içinde tut
        // Bu, WebViewController plugin'inin çalışması için kritik
        let url = navigationAction.request.url
        
        if let urlString = url?.absoluteString {
            print("[CustomBridgeViewController] 🔍 Navigation decision for: \(urlString)")
            print("[CustomBridgeViewController] ✅ Allowing navigation in WebView (preventing Safari)")
            decisionHandler(.allow)
            return
        }
        
        decisionHandler(.allow)
    }
}
```

**2. Amaç:**

- Programatik navigation'ları (WebViewController plugin) WebView içinde tutar
- Safari'ye yönlendirmeyi engeller
- Capacitor'un varsayılan davranışını korur

**3. Lifecycle:**

```swift
override func viewDidLoad() {
    super.viewDidLoad()
    
    // Override navigation delegate to prevent external browser opening
    if let webView = self.webView {
        originalNavigationDelegate = webView.navigationDelegate
        webView.navigationDelegate = self
        print("[CustomBridgeViewController] ✅ Navigation delegate set")
    }
}
```

---

### Katman 3: Plugin Sistemi

#### 3.1 Plugin Yapısı

**Dosya:** `App/Plugins/WebViewController/WebViewController.swift`

```swift
@objc(WebViewController)
public class WebViewController: CAPPlugin {
    public static let identifier = "WebViewController"
    public static let jsName = "WebViewController"
}
```

#### Özellikler

- ✅ `CAPPlugin`'den türer
- ✅ `@objc` ile Objective-C runtime'a expose edilir
- ✅ Capacitor 7 otomatik discovery kullanır
- ✅ Type-safe Swift implementasyonu

#### 3.2 Plugin Metodları

**1. `open(url: String)`:**

```swift
@objc public func open(_ call: CAPPluginCall) {
    guard let urlString = call.getString("url") else {
        call.reject("URL is required")
        return
    }
    
    guard let url = URL(string: urlString) else {
        call.reject("Invalid URL")
        return
    }
    
    DispatchQueue.main.async {
        if let webView = self.bridge?.webView {
            let request = URLRequest(url: url)
            webView.load(request)
            print("[WebViewController] ✅ URL opened (navigation delegate will handle):", urlString)
            call.resolve(["success": true])
        } else {
            call.reject("WebView not available")
        }
    }
}
```

**Özellikler:**
- URL'yi WebView'da açar
- Promise döner (`CAPPluginReturnPromise`)
- Navigation delegate tarafından handle edilir
- Main thread'de çalışır

**2. `loadUrl(url: String)`:**

```swift
@objc public func loadUrl(_ call: CAPPluginCall) {
    // open() ile aynı implementasyon
    // Geriye uyumluluk için
}
```

**3. `reload()`:**

```swift
@objc public func reload(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
        if let webView = self.bridge?.webView {
            webView.reload()
            print("[WebViewController] ✅ WebView reloaded")
            call.resolve()
        } else {
            call.reject("WebView not available")
        }
    }
}
```

**Özellikler:**
- WebView'ı yeniden yükler
- Safari'ye yönlendirmez
- Promise döner

#### 3.3 Objective-C Bridging

**Dosya:** `App/Plugins/WebViewController/WebViewControllerPlugin.m`

```objc
#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the Capacitor plugin macro
CAP_PLUGIN(WebViewController, "WebViewController",
    CAP_PLUGIN_METHOD(open, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(loadUrl, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reload, CAPPluginReturnPromise);
)
```

**Amaç:**

- Swift metodlarını Objective-C runtime'a expose eder
- Capacitor'un plugin discovery mekanizması için gerekli
- JavaScript bridge'e metodları bağlar
- Type-safe method signatures sağlar

**CAP_PLUGIN Macro:**

```objc
CAP_PLUGIN(ClassName, PluginName, Methods...)
```

- `ClassName`: Swift class adı
- `PluginName`: JavaScript'te kullanılacak isim
- `Methods`: Expose edilecek metodlar

---

### Katman 4: Plugin Discovery Mekanizması

#### 4.1 Capacitor Config

**Dosya:** `App/capacitor.config.json`

```json
{
  "appId": "com.kriptokirmizi.alerta",
  "appName": "Alerta Chart",
  "webDir": "public",
  "plugins": {
    "GoogleAuth": {
      "scopes": ["profile", "email"],
      "serverClientId": "...",
      "clientId": "...",
      "forceCodeForRefreshToken": true
    },
    "WebViewController": {}
  },
  "packageClassList": [
    "SignInWithApple",
    "LocalNotificationsPlugin",
    "PushNotificationsPlugin",
    "GoogleAuth",
    "WebViewController"  ← Custom plugin
  ],
  "ios": {
    "contentInset": "automatic"
  }
}
```

#### Nasıl Çalışır?

1. **Build Time:**
   - Capacitor, `packageClassList`'teki class isimlerini okur
   - Objective-C runtime'da bu class'ları arar
   - Bulursa plugin instance'ı oluşturur

2. **Runtime:**
   - Bridge initialization sırasında plugin'ler yüklenir
   - Her plugin'in `load()` metodu çağrılır
   - Plugin JavaScript tarafına expose edilir

3. **Discovery Process:**
   ```
   packageClassList → NSClassFromString() → Plugin Instance → Bridge Registration
   ```

#### 4.2 Plugin Metadata

**Dosya:** `App/public/plugins.json`

```json
{
  "WebViewController": {
    "className": "WebViewController"
  }
}
```

**Amaç:**

- Plugin metadata'sını tutar
- Auto-discovery'ye yardımcı olur
- Build time'da kullanılır
- JavaScript tarafında plugin bilgisi sağlar

---

### Katman 5: Bağımlılık Yönetimi (CocoaPods)

**Dosya:** `Podfile`

```ruby
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '14.0'
use_frameworks!

# workaround to avoid Xcode caching of Pods
install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCommunityAppleSignIn', :path => '../../node_modules/@capacitor-community/apple-sign-in'
  pod 'CapacitorLocalNotifications', :path => '../../node_modules/@capacitor/local-notifications'
  pod 'CapacitorPushNotifications', :path => '../../node_modules/@capacitor/push-notifications'
  pod 'CodetrixStudioCapacitorGoogleAuth', :path => '../../node_modules/@codetrix-studio/capacitor-google-auth'
end

target 'App' do
  capacitor_pods
end

post_install do |installer|
  assertDeploymentTarget(installer)
end
```

#### Kullanılan Plugin'ler

1. **Capacitor Core:**
   - Ana framework
   - Bridge mekanizması
   - Plugin system

2. **CapacitorCordova:**
   - Cordova uyumluluğu
   - Legacy plugin desteği

3. **CapacitorCommunityAppleSignIn:**
   - Apple Sign-In entegrasyonu
   - OAuth flow

4. **CapacitorLocalNotifications:**
   - Yerel bildirimler
   - Background notifications

5. **CapacitorPushNotifications:**
   - Push bildirimleri
   - FCM entegrasyonu

6. **CodetrixStudioCapacitorGoogleAuth:**
   - Google OAuth
   - Sign-In flow

---

### Katman 6: Uygulama Konfigürasyonu

#### 6.1 Info.plist

**Dosya:** `App/Info.plist`

**Önemli Ayarlar:**

```xml
<key>CFBundleIdentifier</key>
<string>com.kriptokirmizi.alerta</string>

<key>CFBundleDisplayName</key>
<string>Alerta Chart</string>

<key>LSRequiresIPhoneOS</key>
<true/>

<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i</string>
        </array>
    </dict>
</array>
```

**Açıklamalar:**

- **Bundle Identifier:** Uygulama kimliği
- **Display Name:** Kullanıcıya gösterilen isim
- **Orientations:** Desteklenen ekran yönleri
- **URL Schemes:** Google OAuth callback için

#### 6.2 Storyboard

- **Main.storyboard:** `CustomBridgeViewController` kullanır
- **LaunchScreen.storyboard:** Splash screen

---

## 🔄 Veri Akışı

### 1. Uygulama Başlatma Akışı

```
┌─────────────────────────────────────────────────────────┐
│ 1. iOS → AppDelegate.didFinishLaunchingWithOptions()    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Capacitor Bridge Initialization                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Plugin Auto-Discovery (packageClassList)             │
│    - NSClassFromString("WebViewController")             │
│    - Plugin instance oluştur                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. WebViewController Plugin Loaded                      │
│    - load() metodu çağrılır                             │
│    - Bridge'e kaydedilir                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. CustomBridgeViewController.viewDidLoad()             │
│    - Navigation delegate set                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Navigation Delegate Set                              │
│    - WKNavigationDelegate override                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. WKWebView Loaded (capacitor://localhost)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. JavaScript App Initialized                          │
│    - index.html yüklenir                                │
│    - React app başlar                                   │
└─────────────────────────────────────────────────────────┘
```

### 2. Plugin Çağrı Akışı

```
┌─────────────────────────────────────────────────────────┐
│ JavaScript:                                             │
│   WebViewController.loadUrl({ url: "https://..." })     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Capacitor Bridge:                                       │
│   - Native method call                                  │
│   - Message queue                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Objective-C Runtime:                                    │
│   WebViewControllerPlugin.m → CAP_PLUGIN_METHOD         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Swift Plugin:                                           │
│   WebViewController.loadUrl(_ call: CAPPluginCall)      │
│   - call.getString("url")                               │
│   - URL validation                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ WKWebView:                                              │
│   webView.load(URLRequest)                              │
│   - Main thread'de çalışır                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Navigation Delegate:                                    │
│   CustomBridgeViewController.decidePolicyFor()           │
│   - URL kontrolü                                        │
│   - .allow decision                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Result:                                                 │
│   - URL WebView içinde yüklenir                         │
│   - Safari'ye yönlendirme YOK ✅                        │
│   - call.resolve() → JavaScript'e başarı döner          │
└─────────────────────────────────────────────────────────┘
```

### 3. Navigation Kontrol Akışı

```
┌─────────────────────────────────────────────────────────┐
│ URL Load Request                                        │
│   (Programmatic veya User-initiated)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ WKNavigationDelegate.decidePolicyFor()                   │
│   - navigationAction.request.url                         │
│   - navigationAction.navigationType                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ CustomBridgeViewController (override)                   │
│   - URL string kontrolü                                │
│   - Navigation type kontrolü                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Decision: .allow                                        │
│   - Tüm navigation'lar WebView içinde kalır             │
│   - Safari'ye yönlendirme engellenir                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Result:                                                 │
│   ✅ URL WebView içinde yüklenir                        │
│   ❌ Safari açılmaz                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Tasarım Kararları

### 1. Capacitor 7 Otomatik Discovery

**Neden?**

- ✅ Manuel kayıt kaldırıldı (Capacitor 7'de)
- ✅ `packageClassList` ile otomatik keşif
- ✅ Daha az boilerplate kodu
- ✅ Standartlaştırılmış yaklaşım

**Nasıl?**

1. Plugin class'ı `@objc` ile işaretlenir
2. `packageClassList`'e eklenir
3. Objective-C bridging dosyası oluşturulur
4. Capacitor otomatik olarak keşfeder

**Avantajlar:**

- ✅ Daha az kod
- ✅ Daha az hata riski
- ✅ Standart pattern
- ✅ Kolay bakım

### 2. Custom Navigation Delegate

**Neden?**

- ❌ Programatik navigation'lar Safari'ye yönleniyordu
- ✅ WebViewController plugin için gerekli
- ✅ Kullanıcı deneyimi için kritik

**Nasıl?**

1. `CustomBridgeViewController` delegate'i override eder
2. Tüm navigation'lar `.allow` edilir
3. Capacitor'un varsayılan davranışı korunur

**Avantajlar:**

- ✅ Tam kontrol
- ✅ Safari'ye yönlendirme yok
- ✅ WebView içinde kalır
- ✅ Kullanıcı deneyimi iyileşir

### 3. Plugin Yapısı

**Neden?**

- ✅ `Plugins/WebViewController/` klasörü
- ✅ Swift + Objective-C bridging
- ✅ Capacitor 7 standartlarına uyum

**Nasıl?**

1. Swift: Plugin implementasyonu
2. Objective-C: Runtime bridging
3. Config: `packageClassList` + `plugins.json`

**Avantajlar:**

- ✅ Organize yapı
- ✅ Kolay bulunabilirlik
- ✅ Standart pattern
- ✅ Ölçeklenebilir

---

## 🔒 Güvenlik ve İzinler

### 1. URL Scheme Handling

**Info.plist:**

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.776781271347-2pice7mn84v1mo1gaccghc6oh5k6do6i</string>
        </array>
    </dict>
</array>
```

**Amaç:**

- Google OAuth callback'lerini yakalamak
- Deep linking desteği
- Universal Links

**Güvenlik:**

- ✅ Sadece belirli URL scheme'ler kabul edilir
- ✅ OAuth flow güvenli
- ✅ Callback validation

### 2. Sandbox Restrictions

**Normal Uyarılar (Kritik Değil):**

- Sandbox extension uyarıları
- LaunchServices hataları
- RBSAssertionError

**Açıklama:**

- Development ortamında normal
- Production'da sorun olmaz
- iOS sistem kısıtlamaları

### 3. Entitlements

**Gerekli Entitlements:**

- ✅ Push Notifications
- ✅ Keychain Sharing (OAuth tokens)
- ✅ Associated Domains (Universal Links)

---

## 🔨 Build Süreci

### 1. CocoaPods Install

```bash
cd ios/App
pod install
```

**Sonuç:**

- `Pods/` klasörü oluşur
- `App.xcworkspace` oluşur
- Dependencies link edilir

**Önemli:**

- ✅ Her zaman `.xcworkspace` açılmalı (NOT `.xcodeproj`)
- ✅ `Podfile.lock` commit edilmeli
- ✅ `Pods/` klasörü `.gitignore`'da olmalı

### 2. Xcode Build

```
1. App.xcworkspace açılır
   ↓
2. Target: App
   ↓
3. Build Phases:
   - [CP] Check Pods Manifest.lock
   - Sources (Swift files compile)
   - Frameworks
   - Resources
   - [CP] Embed Pods Frameworks
   ↓
4. Plugin files Xcode'a eklenmeli:
   - WebViewController.swift
   - WebViewControllerPlugin.m
   - Target Membership: App ✅
   ↓
5. Build → Run
```

**Önemli Adımlar:**

1. **Clean Build Folder:** `Shift + Cmd + K`
2. **Build:** `Cmd + B`
3. **Run:** `Cmd + R`

### 3. Plugin Files Xcode'a Ekleme

**Adımlar:**

1. Xcode'da `App/App` klasörüne sağ tıkla
2. "Add Files to App..." seç
3. Şu dosyaları seç:
   - `App/Plugins/WebViewController/WebViewController.swift`
   - `App/Plugins/WebViewController/WebViewControllerPlugin.m`
4. "Copy items if needed" işaretleme (dosyalar zaten doğru yerde)
5. "Add to targets: App" işaretli olsun
6. "Add" butonuna tıkla

**Kontrol:**

- Dosyalar Project Navigator'da görünmeli
- Target Membership'te "App" işaretli olmalı
- Build Phases → Compile Sources'da olmalı

---

## 🌉 JavaScript ↔ Native İletişim

### 1. Capacitor Bridge

**JavaScript Tarafı:**

```javascript
// Import
import { WebViewController } from "capacitor-webviewcontroller";

// Kullanım
await WebViewController.loadUrl({ url: "https://alertachart.com" });
```

**TypeScript Types:**

```typescript
interface WebViewControllerPlugin {
  open(options: { url: string }): Promise<{ success: boolean }>;
  loadUrl(options: { url: string }): Promise<void>;
  reload(): Promise<void>;
}
```

### 2. Native Taraf

**Swift:**

```swift
@objc public func loadUrl(_ call: CAPPluginCall) {
    // call.getString("url") → JavaScript'ten gelen parametre
    // call.resolve() → JavaScript'e başarı döner
    // call.reject() → JavaScript'e hata döner
}
```

**Objective-C Bridging:**

```objc
CAP_PLUGIN_METHOD(loadUrl, CAPPluginReturnPromise);
```

### 3. Bridge Mekanizması

```
┌─────────────────────────────────────────────────────────┐
│ JavaScript Thread                                       │
│   - WebViewController.loadUrl() çağrılır                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Capacitor Bridge (Message Queue)                        │
│   - Serialization                                       │
│   - Message routing                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Native Thread (Main Queue)                             │
│   - Plugin method execution                            │
│   - WKWebView manipulation                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Response (Promise)                                      │
│   - call.resolve() veya call.reject()                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ JavaScript Thread                                       │
│   - Promise resolve/reject                              │
│   - await tamamlanır                                    │
└─────────────────────────────────────────────────────────┘
```

### 4. Thread Safety

**Önemli:**

- ✅ Native metodlar `DispatchQueue.main.async` içinde çalışmalı
- ✅ UI işlemleri main thread'de olmalı
- ✅ JavaScript thread'den native thread'e geçiş otomatik

**Örnek:**

```swift
@objc public func loadUrl(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
        // UI işlemleri burada
        if let webView = self.bridge?.webView {
            webView.load(request)
        }
    }
}
```

---

## 📊 Özet

### Mimari Katmanlar

1. **AppDelegate:** Lifecycle yönetimi
2. **CustomBridgeViewController:** WebView ve navigation kontrolü
3. **WebViewController Plugin:** Custom native functionality
4. **Capacitor Bridge:** JavaScript ↔ Native iletişim
5. **CocoaPods:** Dependency management
6. **Auto-Discovery:** Plugin registration

### Özellikler

- ✅ **Capacitor 7 Uyumlu:** En son standartlar
- ✅ **Otomatik Plugin Discovery:** Manuel kayıt yok
- ✅ **Navigation Kontrolü:** Safari'ye yönlendirme yok
- ✅ **Type-Safe:** Swift plugin'ler
- ✅ **Objective-C Runtime:** Entegrasyon
- ✅ **Ölçeklenebilir:** Yeni plugin'ler kolay eklenir

### Güçlü Yönler

1. **Standart Pattern:** Capacitor 7 best practices
2. **Minimal Kod:** Gereksiz boilerplate yok
3. **Kolay Bakım:** Organize yapı
4. **Type Safety:** Swift + TypeScript
5. **Güvenli:** Sandbox restrictions
6. **Performanslı:** Native thread kullanımı

### Geliştirme Notları

1. **Xcode Workspace:** Her zaman `.xcworkspace` aç
2. **Plugin Files:** Xcode'a eklenmeli
3. **Target Membership:** "App" işaretli olmalı
4. **Clean Build:** Yeni plugin eklerken gerekli
5. **Pod Install:** Dependency değişikliklerinde

---

## 📚 Referanslar

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Capacitor Plugin Guide](https://capacitorjs.com/docs/plugins)
- [WKWebView Documentation](https://developer.apple.com/documentation/webkit/wkwebview)
- [CocoaPods Guide](https://guides.cocoapods.org/)

---

**Son Güncelleme:** 2025-11-15  
**Versiyon:** 1.0  
**Capacitor:** 7.4.4  
**iOS Minimum:** 14.0

