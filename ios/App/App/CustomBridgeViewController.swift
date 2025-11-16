import UIKit
import Capacitor
import WebKit

// Custom Bridge View Controller
// Capacitor 7 uses automatic plugin discovery via packageClassList
// WebViewController will be auto-discovered if properly configured
class CustomBridgeViewController: CAPBridgeViewController {
    
    private var originalNavigationDelegate: WKNavigationDelegate?
    
    override func viewDidLoad() {
        print("[CustomBridgeViewController] ✅ Bridge view controller loading")
        print("[CustomBridgeViewController] ℹ️ Plugins will be auto-discovered via packageClassList")
        super.viewDidLoad()
        
        // Configure WebView for native app behavior (like Android)
        configureWebViewForNativeApp()
    }
    
    private func configureWebViewForNativeApp() {
        guard let webView = self.webView else {
            print("[CustomBridgeViewController] ⚠️ WebView not available")
            return
        }
        
        // 🔥 CRITICAL: Configure cookie persistence for session restore
        let configuration = webView.configuration
        let dataStore = configuration.websiteDataStore
        
        // Enable cookie persistence (default is already enabled, but make sure)
        if #available(iOS 11.0, *) {
            // WKWebsiteDataStore.default() already persists cookies
            // But we can explicitly set it to ensure persistence
            print("[CustomBridgeViewController] ✅ Cookie persistence enabled (WKWebsiteDataStore)")
        }
        
        // Navigation delegate
        originalNavigationDelegate = webView.navigationDelegate
        webView.navigationDelegate = self
        webView.uiDelegate = self
        
        // 🔥 CRITICAL: Disable text selection for native app behavior (like Android)
        configureTextSelection(webView: webView)
        
        // Disable gesture recognizers that enable text selection
        disableTextSelectionGestures(webView: webView)
        
        print("[CustomBridgeViewController] ✅ WebView configured for native app behavior")
    }
    
    private func configureTextSelection(webView: WKWebView) {
        // WKWebView configuration
        let configuration = webView.configuration
        
        // Disable link preview (iOS 9+)
        // Note: allowsLinkPreview is a property of WKWebView, not WKWebViewConfiguration
        if #available(iOS 9.0, *) {
            webView.allowsLinkPreview = false
        }
        
        print("[CustomBridgeViewController] ✅ Text selection configuration disabled")
    }
    
    private func disableTextSelectionGestures(webView: WKWebView) {
        // Remove/disable long press gesture recognizers that enable text selection
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
        // Allow all navigation actions to stay in WebView
        // This prevents Safari from opening when WebViewController plugin loads URLs
        let url = navigationAction.request.url
        
        // Log the navigation
        if let urlString = url?.absoluteString {
            print("[CustomBridgeViewController] 🔍 Navigation decision for: \(urlString)")
            print("[CustomBridgeViewController] 🔍 Navigation type: \(navigationAction.navigationType.rawValue)")
            
            // Always allow navigation in WebView - never open Safari
            // This is critical for WebViewController plugin to work correctly
            print("[CustomBridgeViewController] ✅ Allowing navigation in WebView (preventing Safari)")
            decisionHandler(.allow)
            return
        }
        
        // Fallback: allow navigation
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        // Allow all navigation responses
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Log page load
        if let url = webView.url {
            print("[CustomBridgeViewController] 📄 Page finished loading: \(url.absoluteString)")
            
            // Check if index.html loaded
            if url.absoluteString.contains("capacitor://localhost") || url.absoluteString.contains("index.html") {
                print("[CustomBridgeViewController] ✅ index.html loaded - checking if JavaScript is running...")
                
                // Wait a bit for JavaScript to execute, then check
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    webView.evaluateJavaScript("""
                        (function() {
                            if (typeof window !== 'undefined' && window.Capacitor) {
                                return 'Capacitor found - JavaScript is running';
                            }
                            return 'Capacitor not found - JavaScript may not be running';
                        })();
                    """) { (result, error) in
                        if let error = error {
                            print("[CustomBridgeViewController] ❌ JavaScript check failed: \(error)")
                        } else {
                            print("[CustomBridgeViewController] 🔍 JavaScript check result: \(result ?? "nil")")
                        }
                    }
                }
            }
        }
        
        // Inject CSS to disable text selection (fallback method)
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
        // Return nil to disable context menu completely (like Android)
        completionHandler(nil)
        print("[CustomBridgeViewController] ✅ Context menu disabled")
    }
    
    // Disable preview for links - iOS 9+
    @available(iOS 9.0, *)
    func webView(_ webView: WKWebView, 
                 shouldPreviewElement elementInfo: WKPreviewElementInfo) -> Bool {
        // Return false to disable link preview (like Android)
        return false
    }
}

