# 📱 iOS Native App Davranışı - Metin Seçimi/Kopyalama Devre Dışı

## 🔍 Sorun Analizi

### Android vs iOS Davranış Farkı

**Android:**
- ✅ Metin seçimi/kopyalama YOK
- ✅ Native app gibi davranıyor
- ✅ Long press ile hiçbir şey seçilemiyor

**iOS:**
- ❌ Metin seçimi/kopyalama VAR
- ❌ Safari gibi davranıyor
- ❌ Long press ile metin seçilebiliyor

### Neden Bu Fark Var?

**Android WebView:**
- Varsayılan olarak text selection sınırlı
- Capacitor'un Android implementasyonu text selection'ı desteklemiyor
- Native app davranışı varsayılan

**iOS WKWebView:**
- Varsayılan olarak text selection aktif
- Safari benzeri davranış
- Long press menu aktif
- Link preview aktif

---

## 🎯 Çözüm: iOS'ta Native App Davranışı

### Yaklaşım 1: WKWebView Configuration (Öncelikli)

**Dosya:** `App/CustomBridgeViewController.swift`

WKWebView configuration'da text selection'ı devre dışı bırakma:

```swift
override func viewDidLoad() {
    super.viewDidLoad()
    
    if let webView = self.webView {
        // Navigation delegate
        originalNavigationDelegate = webView.navigationDelegate
        webView.navigationDelegate = self
        
        // 🔥 CRITICAL: Disable text selection for native app behavior
        // Get WKWebView configuration
        if let configuration = webView.configuration as? WKWebViewConfiguration {
            // Disable text selection
            configuration.selectionGranularity = .none
            
            // Disable link preview (iOS 9+)
            if #available(iOS 9.0, *) {
                configuration.allowsLinkPreview = false
            }
            
            print("[CustomBridgeViewController] ✅ Text selection disabled")
        }
        
        // Disable long press gesture recognizer
        disableTextSelectionGestures(webView: webView)
    }
}

private func disableTextSelectionGestures(webView: WKWebView) {
    // Remove all gesture recognizers that enable text selection
    for gesture in webView.gestureRecognizers ?? [] {
        if gesture is UILongPressGestureRecognizer {
            gesture.isEnabled = false
            print("[CustomBridgeViewController] ✅ Long press gesture disabled")
        }
    }
}
```

### Yaklaşım 2: JavaScript Injection (CSS)

**Dosya:** `App/CustomBridgeViewController.swift`

JavaScript injection ile CSS ekleme (fallback):

```swift
override func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    // Inject CSS to disable text selection
    let disableSelectionCSS = """
        * {
            -webkit-user-select: none !important;
            -webkit-touch-callout: none !important;
            user-select: none !important;
        }
    """
    
    let script = """
        (function() {
            var style = document.createElement('style');
            style.innerHTML = '\(disableSelectionCSS)';
            document.head.appendChild(style);
        })();
    """
    
    webView.evaluateJavaScript(script) { (result, error) in
        if let error = error {
            print("[CustomBridgeViewController] ❌ Failed to inject CSS: \(error)")
        } else {
            print("[CustomBridgeViewController] ✅ CSS injected to disable text selection")
        }
    }
}
```

### Yaklaşım 3: WKUIDelegate Override

**Dosya:** `App/CustomBridgeViewController.swift`

Context menu'yu devre dışı bırakma:

```swift
extension CustomBridgeViewController: WKUIDelegate {
    // Disable context menu (long press menu)
    func webView(_ webView: WKWebView, 
                 contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, 
                 completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        // Return nil to disable context menu
        completionHandler(nil)
        print("[CustomBridgeViewController] ✅ Context menu disabled")
    }
}
```

---

## 🏗️ Tam Implementasyon

### CustomBridgeViewController.swift (Güncellenmiş)

```swift
import UIKit
import Capacitor
import WebKit

class CustomBridgeViewController: CAPBridgeViewController {
    
    private var originalNavigationDelegate: WKNavigationDelegate?
    
    override func viewDidLoad() {
        print("[CustomBridgeViewController] ✅ Bridge view controller loading")
        print("[CustomBridgeViewController] ℹ️ Plugins will be auto-discovered via packageClassList")
        super.viewDidLoad()
        
        // Configure WebView for native app behavior
        configureWebViewForNativeApp()
    }
    
    private func configureWebViewForNativeApp() {
        guard let webView = self.webView else {
            print("[CustomBridgeViewController] ⚠️ WebView not available")
            return
        }
        
        // Navigation delegate
        originalNavigationDelegate = webView.navigationDelegate
        webView.navigationDelegate = self
        webView.uiDelegate = self
        
        // 🔥 CRITICAL: Disable text selection for native app behavior
        configureTextSelection(webView: webView)
        
        // Disable gesture recognizers
        disableTextSelectionGestures(webView: webView)
        
        print("[CustomBridgeViewController] ✅ WebView configured for native app behavior")
    }
    
    private func configureTextSelection(webView: WKWebView) {
        // WKWebView configuration
        if let configuration = webView.configuration as? WKWebViewConfiguration {
            // Disable text selection granularity
            configuration.selectionGranularity = .none
            
            // Disable link preview (iOS 9+)
            if #available(iOS 9.0, *) {
                configuration.allowsLinkPreview = false
            }
            
            print("[CustomBridgeViewController] ✅ Text selection configuration disabled")
        }
    }
    
    private func disableTextSelectionGestures(webView: WKWebView) {
        // Remove/disable long press gesture recognizers
        for gesture in webView.gestureRecognizers ?? [] {
            if gesture is UILongPressGestureRecognizer {
                gesture.isEnabled = false
                print("[CustomBridgeViewController] ✅ Long press gesture disabled")
            }
        }
    }
}

// MARK: - WKNavigationDelegate
extension CustomBridgeViewController: WKNavigationDelegate {
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        
        if let urlString = url?.absoluteString {
            print("[CustomBridgeViewController] 🔍 Navigation decision for: \(urlString)")
            print("[CustomBridgeViewController] ✅ Allowing navigation in WebView (preventing Safari)")
            decisionHandler(.allow)
            return
        }
        
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Inject CSS to disable text selection (fallback)
        injectDisableSelectionCSS(webView: webView)
    }
    
    private func injectDisableSelectionCSS(webView: WKWebView) {
        let disableSelectionCSS = """
            * {
                -webkit-user-select: none !important;
                -webkit-touch-callout: none !important;
                user-select: none !important;
            }
        """
        
        let script = """
            (function() {
                var style = document.createElement('style');
                style.innerHTML = '\(disableSelectionCSS)';
                style.id = 'native-app-disable-selection';
                if (!document.getElementById('native-app-disable-selection')) {
                    document.head.appendChild(style);
                }
            })();
        """
        
        webView.evaluateJavaScript(script) { (result, error) in
            if let error = error {
                print("[CustomBridgeViewController] ❌ Failed to inject CSS: \(error)")
            } else {
                print("[CustomBridgeViewController] ✅ CSS injected to disable text selection")
            }
        }
    }
}

// MARK: - WKUIDelegate
extension CustomBridgeViewController: WKUIDelegate {
    
    // Disable context menu (long press menu) - iOS 13+
    @available(iOS 13.0, *)
    func webView(_ webView: WKWebView, 
                 contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo, 
                 completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        // Return nil to disable context menu completely
        completionHandler(nil)
        print("[CustomBridgeViewController] ✅ Context menu disabled")
    }
    
    // Disable preview for links - iOS 9+
    @available(iOS 9.0, *)
    func webView(_ webView: WKWebView, 
                 shouldPreviewElement elementInfo: WKPreviewElementInfo) -> Bool {
        // Return false to disable link preview
        return false
    }
}
```

---

## 🔧 Alternatif Yaklaşım: WKWebView Subclass

Eğer yukarıdaki yaklaşım yeterli olmazsa, WKWebView'ı subclass edebiliriz:

```swift
class NonSelectableWebView: WKWebView {
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        // Disable all text selection actions
        if action == #selector(UIResponderStandardEditActions.copy(_:)) ||
           action == #selector(UIResponderStandardEditActions.select(_:)) ||
           action == #selector(UIResponderStandardEditActions.selectAll(_:)) {
            return false
        }
        return super.canPerformAction(action, withSender: sender)
    }
    
    override func becomeFirstResponder() -> Bool {
        // Prevent becoming first responder (which enables text selection)
        return false
    }
}
```

**Not:** Bu yaklaşım Capacitor'un internal WebView yapısıyla uyumlu olmayabilir.

---

## 📊 Karşılaştırma: Android vs iOS

### Android (Mevcut)

```java
// Android WebView varsayılan olarak text selection'ı desteklemiyor
// Veya Capacitor'un implementasyonu text selection'ı devre dışı bırakıyor
// Ekstra bir şey yapmaya gerek yok
```

### iOS (Önerilen Çözüm)

```swift
// 1. WKWebView Configuration
configuration.selectionGranularity = .none
configuration.allowsLinkPreview = false

// 2. Gesture Recognizers
longPressGesture.isEnabled = false

// 3. CSS Injection (Fallback)
-webkit-user-select: none
-webkit-touch-callout: none

// 4. WKUIDelegate
contextMenuConfigurationForElement → nil
```

---

## 🎯 Önerilen Implementasyon Sırası

1. **Öncelik 1:** WKWebView Configuration
   - `selectionGranularity = .none`
   - `allowsLinkPreview = false`

2. **Öncelik 2:** Gesture Recognizers
   - Long press gesture'ı devre dışı bırak

3. **Öncelik 3:** CSS Injection
   - Fallback olarak CSS ekle

4. **Öncelik 4:** WKUIDelegate
   - Context menu'yu devre dışı bırak

---

## ✅ Beklenen Sonuç

**iOS'ta (Uygulama Sonrası):**
- ✅ Metin seçimi/kopyalama YOK
- ✅ Long press ile hiçbir şey seçilemiyor
- ✅ Context menu görünmüyor
- ✅ Link preview yok
- ✅ Android ile aynı davranış

**Kullanıcı Deneyimi:**
- ✅ Native app gibi davranış
- ✅ Safari benzeri davranış yok
- ✅ Tutarlı platform deneyimi

---

## 🔍 Test Senaryoları

1. **Metin Seçimi Testi:**
   - Watchlist'te bir metne basılı tut
   - Beklenen: Hiçbir şey seçilmemeli

2. **Long Press Testi:**
   - Herhangi bir yerde uzun bas
   - Beklenen: Context menu görünmemeli

3. **Link Preview Testi:**
   - Bir link'e basılı tut
   - Beklenen: Preview görünmemeli

4. **Kopyalama Testi:**
   - Metin seçmeye çalış
   - Beklenen: Seçim yapılamamalı

---

## 📝 Notlar

- **CSS Injection:** Her sayfa yüklendiğinde tekrar enjekte edilmeli
- **Gesture Recognizers:** WebView'ın internal gesture'ları değişebilir
- **iOS Versiyonları:** Bazı özellikler iOS 9+ veya iOS 13+ gerektirir
- **Capacitor Updates:** Capacitor güncellemeleri WebView yapısını değiştirebilir

---

**Son Güncelleme:** 2025-11-15  
**Durum:** Önerilen Çözüm  
**Öncelik:** Yüksek

