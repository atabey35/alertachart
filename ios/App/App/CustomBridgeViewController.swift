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
                print("[CustomBridgeViewController] ✅ index.html loaded - checking for saved session...")
                
                // Wait a bit for Capacitor bridge to be ready, then check Preferences
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    // Check Preferences for refreshToken
                    let checkTokenScript = """
                        (async function() {
                            try {
                                if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences) {
                                    const result = await window.Capacitor.Plugins.Preferences.get({ key: 'refreshToken' });
                                    if (result && result.value) {
                                        return { hasToken: true, token: result.value };
                                    }
                                }
                                return { hasToken: false };
                            } catch (error) {
                                return { hasToken: false, error: error.message };
                            }
                        })();
                    """
                    
                    webView.evaluateJavaScript(checkTokenScript) { (result, error) in
                        if let error = error {
                            print("[CustomBridgeViewController] ❌ Error checking Preferences:", error)
                            return
                        }
                        
                        // Parse result (it's a dictionary from JavaScript)
                        if let resultDict = result as? [String: Any],
                           let hasToken = resultDict["hasToken"] as? Bool,
                           hasToken == true,
                           let token = resultDict["token"] as? String {
                            print("[CustomBridgeViewController] ✅ RefreshToken found in Preferences - restoring session...")
                            
                            // 🔥 CRITICAL: First restore session via API to set cookies, then redirect to dashboard
                            // We need to call restore-session API with the token to set cookies properly
                            // Use CapacitorHttp since fetch doesn't work from capacitor://localhost
                            let restoreSessionScript = """
                                (async function() {
                                    try {
                                        const CapacitorHttp = window.Capacitor?.Plugins?.CapacitorHttp;
                                        if (!CapacitorHttp) {
                                            return { success: false, error: 'CapacitorHttp not available' };
                                        }
                                        
                                        // Call restore-session API with token in body
                                        const response = await CapacitorHttp.post({
                                            url: 'https://alertachart.com/api/auth/restore-session',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            data: {
                                                refreshToken: '\(token)'
                                            }
                                        });
                                        
                                        if (response.status === 200) {
                                            return { success: true };
                                        } else {
                                            return { success: false, error: 'Restore session failed', status: response.status };
                                        }
                                    } catch (error) {
                                        return { success: false, error: error.message || 'Unknown error' };
                                    }
                                })();
                            """
                            
                            webView.evaluateJavaScript(restoreSessionScript) { (restoreResult, restoreError) in
                                if let restoreError = restoreError {
                                    print("[CustomBridgeViewController] ❌ Error restoring session:", restoreError)
                                    return
                                }
                                
                                if let restoreDict = restoreResult as? [String: Any],
                                   let success = restoreDict["success"] as? Bool,
                                   success == true {
                                    print("[CustomBridgeViewController] ✅ Session restored - redirecting to dashboard...")
                                    
                                    // Wait a bit for cookies to be set, then redirect
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                        let dashboardURL = URL(string: "https://alertachart.com/")!
                                        let request = URLRequest(url: dashboardURL)
                                        webView.load(request)
                                        print("[CustomBridgeViewController] ✅ Redirected to dashboard")
                                    }
                                } else {
                                    print("[CustomBridgeViewController] ⚠️ Session restore failed - showing login screen")
                                }
                            }
                        } else {
                            print("[CustomBridgeViewController] ℹ️ No refreshToken found - showing login screen")
                        }
                    }
                }
            }
        }
        
        // Inject CSS to disable text selection (wait for DOM to be ready)
        // Use a delay to ensure page is fully loaded
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.injectDisableSelectionCSS(webView: webView)
        }
    }
    
    private func injectDisableSelectionCSS(webView: WKWebView) {
        // Check if document is ready before injecting CSS
        let checkReadyScript = """
            (function() {
                if (document.readyState === 'loading') {
                    return false;
                }
                return document.head !== null;
            })();
        """
        
        webView.evaluateJavaScript(checkReadyScript) { [weak self] (result, error) in
            guard let self = self else { return }
            
            if let error = error {
                // Page might not be ready yet, try again after a delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.injectDisableSelectionCSS(webView: webView)
                }
                return
            }
            
            if let isReady = result as? Bool, isReady {
                // Document is ready, inject CSS
                let disableSelectionCSS = """
                    * {
                        -webkit-user-select: none !important;
                        -webkit-touch-callout: none !important;
                        user-select: none !important;
                    }
                """
                
                let script = """
                    (function() {
                        try {
                            if (document.head) {
                                var style = document.createElement('style');
                                style.innerHTML = '\(disableSelectionCSS)';
                                style.id = 'native-app-disable-selection';
                                if (!document.getElementById('native-app-disable-selection')) {
                                    document.head.appendChild(style);
                                }
                                return true;
                            }
                            return false;
                        } catch (e) {
                            return false;
                        }
                    })();
                """
                
                webView.evaluateJavaScript(script) { (result, error) in
                    if let error = error {
                        // Silently fail - this is not critical
                        print("[CustomBridgeViewController] ⚠️ CSS injection skipped (page not ready): \(error.localizedDescription)")
                    } else {
                        print("[CustomBridgeViewController] ✅ CSS injected to disable text selection")
                    }
                }
            } else {
                // Document not ready, retry after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.injectDisableSelectionCSS(webView: webView)
                }
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

