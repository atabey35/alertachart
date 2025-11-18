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
        
        // 🔥 CRITICAL: iPad-specific view controller configuration
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Force full-screen presentation on iPad
            self.modalPresentationStyle = .fullScreen
            // Prevent iPad from showing as a popover or split view
            if #available(iOS 13.0, *) {
                self.isModalInPresentation = true
            }
            // 🔥 CRITICAL: Remove safe area insets and extend layout to status bar
            self.edgesForExtendedLayout = .all
            self.extendedLayoutIncludesOpaqueBars = true
            self.automaticallyAdjustsScrollViewInsets = false
            
            // 🔥 CRITICAL: Force status bar to hide immediately
            print("[CustomBridgeViewController] 🔥 iPad detected - forcing status bar hidden")
            self.setNeedsStatusBarAppearanceUpdate()
            
            // Force update on next run loop
            DispatchQueue.main.async { [weak self] in
                self?.setNeedsStatusBarAppearanceUpdate()
            }
        }
        
        // Configure WebView for native app behavior (like Android)
        configureWebViewForNativeApp()
    }
    
    // 🔥 CRITICAL: Hide status bar on iPad for native app appearance
    override var prefersStatusBarHidden: Bool {
        let isPad = UIDevice.current.userInterfaceIdiom == .pad
        if isPad {
            print("[CustomBridgeViewController] ✅ prefersStatusBarHidden = true (iPad)")
            return true // Hide status bar on iPad
        }
        return false // Show status bar on iPhone
    }
    
    // 🔥 CRITICAL: Force status bar update on iPad - override child controller
    override var childForStatusBarHidden: UIViewController? {
        // Return nil to use this view controller's preference
        return nil
    }
    
    // 🔥 CRITICAL: Force status bar style on iPad
    override var preferredStatusBarStyle: UIStatusBarStyle {
        if UIDevice.current.userInterfaceIdiom == .pad {
            return .lightContent // Dark background, light status bar
        }
        return .lightContent
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // 🔥 CRITICAL: iPad-specific configuration on view appear
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Ensure full screen on iPad
            if let window = self.view.window {
                window.rootViewController?.modalPresentationStyle = .fullScreen
                // Force window to fill entire screen
                window.frame = UIScreen.main.bounds
            }
            // Force status bar to hide (UIViewControllerBasedStatusBarAppearance = true)
            self.setNeedsStatusBarAppearanceUpdate()
            // Also update parent if exists
            if let parent = self.parent {
                parent.setNeedsStatusBarAppearanceUpdate()
            }
            // Also update window's root view controller
            if let window = self.view.window, let rootVC = window.rootViewController {
                rootVC.setNeedsStatusBarAppearanceUpdate()
            }
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // 🔥 CRITICAL: Final iPad configuration after view appears
        if UIDevice.current.userInterfaceIdiom == .pad {
            configureWebViewForNativeApp() // Re-apply in case WebView wasn't ready
            
            // Force full screen layout
            if let window = self.view.window {
                window.frame = UIScreen.main.bounds
                self.view.frame = window.bounds
            }
            
            // Ensure WebView fills entire screen (no safe areas - including status bar area)
            if let webView = self.webView {
                webView.frame = CGRect(x: 0, y: 0, width: self.view.bounds.width, height: self.view.bounds.height)
                webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
                // Force layout update
                self.view.setNeedsLayout()
                self.view.layoutIfNeeded()
            }
            
            // Hide status bar
            self.setNeedsStatusBarAppearanceUpdate()
            
            // Force status bar to hide immediately (multiple attempts)
            DispatchQueue.main.async {
                self.setNeedsStatusBarAppearanceUpdate()
            }
            
            // Retry status bar hiding after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.setNeedsStatusBarAppearanceUpdate()
                if let window = self.view.window {
                    window.rootViewController?.setNeedsStatusBarAppearanceUpdate()
                }
            }
        }
    }
    
    // 🔥 CRITICAL: Override safe area insets for iPad to remove status bar area
    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Force safe area insets to zero on iPad
            if #available(iOS 11.0, *) {
                self.additionalSafeAreaInsets = UIEdgeInsets.zero
            }
        }
    }
    
    // 🔥 CRITICAL: Override viewDidLayoutSubviews to force WebView layout on iPad
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Force WebView to fill entire screen every time layout changes
            if let webView = self.webView {
                // Remove any safe area insets
                if #available(iOS 11.0, *) {
                    webView.scrollView.contentInsetAdjustmentBehavior = .never
                    webView.scrollView.contentInset = .zero
                    webView.scrollView.scrollIndicatorInsets = .zero
                }
                
                // Force frame to fill entire view (including status bar area)
                let fullFrame = CGRect(x: 0, y: 0, width: self.view.bounds.width, height: self.view.bounds.height)
                if webView.frame != fullFrame {
                    webView.frame = fullFrame
                }
                
                // Force status bar to hide (via prefersStatusBarHidden)
                self.setNeedsStatusBarAppearanceUpdate()
            }
        }
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
        
        // 🔥 CRITICAL: iPad-specific configuration to prevent web-like behavior
        if UIDevice.current.userInterfaceIdiom == .pad {
            // Disable iPad-specific web behaviors
            if #available(iOS 13.0, *) {
                // Prevent iPad from showing web-like UI
                webView.configuration.preferences.isFraudulentWebsiteWarningEnabled = false
            }
            
            // 🔥 CRITICAL: Disable all web-like UI elements
            webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
            if #available(iOS 15.4, *) {
                webView.configuration.preferences.isElementFullscreenEnabled = false
            }
            
            // 🔥 CRITICAL: Change user agent to hide web browser identity (keep iPad identifier for detection)
            let customUserAgent = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AlertaChart/1.0"
            webView.customUserAgent = customUserAgent
            print("[CustomBridgeViewController] ✅ Custom User-Agent set for iPad: \(customUserAgent)")
            
            // Force full-screen behavior on iPad
            if #available(iOS 11.0, *) {
                // Ensure WebView uses full screen (no safe area insets)
                webView.scrollView.contentInsetAdjustmentBehavior = .never
                webView.scrollView.contentInset = .zero
                webView.scrollView.scrollIndicatorInsets = .zero
                if #available(iOS 13.0, *) {
                    webView.scrollView.automaticallyAdjustsScrollIndicatorInsets = false
                }
                // Disable zoom on iPad
                webView.scrollView.minimumZoomScale = 1.0
                webView.scrollView.maximumZoomScale = 1.0
                webView.scrollView.zoomScale = 1.0
                // Disable bounce
                webView.scrollView.bounces = false
                webView.scrollView.alwaysBounceVertical = false
                webView.scrollView.alwaysBounceHorizontal = false
                // Disable scroll indicators for native app feel
                webView.scrollView.showsVerticalScrollIndicator = false
                webView.scrollView.showsHorizontalScrollIndicator = false
            }
            
            // Disable iPad-specific gestures
            webView.scrollView.pinchGestureRecognizer?.isEnabled = false
            webView.scrollView.panGestureRecognizer.isEnabled = true // Keep pan for scrolling (non-optional)
            
            // 🔥 CRITICAL: Ensure WebView fills entire view (including status bar area)
            // Set frame to fill entire view (no safe area insets)
            webView.frame = CGRect(x: 0, y: 0, width: self.view.bounds.width, height: self.view.bounds.height)
            webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            
            // Update constraints if using Auto Layout
            if webView.translatesAutoresizingMaskIntoConstraints == false {
                // Remove old constraints if any
                webView.removeConstraints(webView.constraints)
                let parentConstraints = self.view.constraints.filter { constraint in
                    constraint.firstItem === webView || constraint.secondItem === webView
                }
                self.view.removeConstraints(parentConstraints)
                
                // Add constraints to fill entire view (including status bar area - no safe area)
                NSLayoutConstraint.activate([
                    webView.topAnchor.constraint(equalTo: self.view.topAnchor, constant: 0),
                    webView.leadingAnchor.constraint(equalTo: self.view.leadingAnchor, constant: 0),
                    webView.trailingAnchor.constraint(equalTo: self.view.trailingAnchor, constant: 0),
                    webView.bottomAnchor.constraint(equalTo: self.view.bottomAnchor, constant: 0)
                ])
            }
            
            // Force layout update
            self.view.setNeedsLayout()
            self.view.layoutIfNeeded()
            
            print("[CustomBridgeViewController] ✅ iPad-specific configuration applied")
        }
        
        // 🔥 CRITICAL: Add X-Platform: ios header to all requests via URLSchemeHandler
        // This is done in decidePolicyFor navigationAction instead
        
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
            
            // Removed header injection - it was breaking WebView rendering
            // Platform detection now uses User-Agent in Next.js
            
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
            
            // 🔥 CRITICAL: Inject viewport and CSS for iPad native app feel
            if UIDevice.current.userInterfaceIdiom == .pad {
                injectNativeAppStyles(webView: webView)
            }
            
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
                            
                            // 🔥 CRITICAL: Escape token for JavaScript string to prevent syntax errors
                            // Token may contain quotes, backslashes, or other special characters
                            let escapedToken = token
                                .replacingOccurrences(of: "\\", with: "\\\\")  // Escape backslashes first
                                .replacingOccurrences(of: "'", with: "\\'")    // Escape single quotes
                                .replacingOccurrences(of: "\"", with: "\\\"")   // Escape double quotes
                                .replacingOccurrences(of: "\n", with: "\\n")   // Escape newlines
                                .replacingOccurrences(of: "\r", with: "\\r")   // Escape carriage returns
                                .replacingOccurrences(of: "\t", with: "\\t")   // Escape tabs
                            
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
                                        // Token is properly escaped to prevent JavaScript syntax errors
                                        const response = await CapacitorHttp.post({
                                            url: 'https://alertachart.com/api/auth/restore-session',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            data: {
                                                refreshToken: '\(escapedToken)'
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
    
    private func injectNativeAppStyles(webView: WKWebView) {
        // Inject viewport meta tag and CSS for native app feel on iPad
        let script = """
            (function() {
                try {
                    // Update or create viewport meta tag
                    let viewport = document.querySelector('meta[name="viewport"]');
                    if (!viewport) {
                        viewport = document.createElement('meta');
                        viewport.name = 'viewport';
                        document.head.appendChild(viewport);
                    }
                    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
                    
                    // Inject CSS for native app feel
                    let style = document.getElementById('native-app-ipad-styles');
                    if (!style) {
                        style = document.createElement('style');
                        style.id = 'native-app-ipad-styles';
                        document.head.appendChild(style);
                    }
                    
                    style.innerHTML = `
                        html {
                            width: 100% !important;
                            height: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-text-size-adjust: 100% !important;
                            -webkit-tap-highlight-color: transparent !important;
                        }
                        
                        body {
                            width: 100% !important;
                            min-height: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-text-size-adjust: 100% !important;
                            -webkit-tap-highlight-color: transparent !important;
                            position: relative !important;
                        }
                        
                        /* Prevent web-like appearance */
                        * {
                            -webkit-tap-highlight-color: transparent !important;
                            -webkit-touch-callout: none !important;
                        }
                        
                        /* Ensure content doesn't overflow in web-like way */
                        #__next, [data-nextjs-scroll-focus-boundary] {
                            width: 100% !important;
                            max-width: 100% !important;
                        }
                    `;
                    
                    // Force body to fill screen (but allow scrolling)
                    if (document.body) {
                        document.body.style.width = '100%';
                        document.body.style.minHeight = '100%';
                        document.body.style.margin = '0';
                        document.body.style.padding = '0';
                    }
                    
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            })();
        """
        
        // Wait for DOM to be ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            webView.evaluateJavaScript(script) { (result, error) in
                if let error = error {
                    print("[CustomBridgeViewController] ⚠️ Error injecting native app styles: \(error.localizedDescription)")
                } else {
                    print("[CustomBridgeViewController] ✅ Native app styles injected for iPad")
                }
            }
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
                // Escape CSS for JavaScript string to prevent syntax errors
                let disableSelectionCSS = """
                    * {
                        -webkit-user-select: none !important;
                        -webkit-touch-callout: none !important;
                        user-select: none !important;
                    }
                """
                
                // Escape CSS for JavaScript string (escape backslashes and single quotes)
                let escapedCSS = disableSelectionCSS
                    .replacingOccurrences(of: "\\", with: "\\\\")  // Escape backslashes first
                    .replacingOccurrences(of: "'", with: "\\'")    // Escape single quotes
                    .replacingOccurrences(of: "\n", with: "\\n")   // Escape newlines
                    .replacingOccurrences(of: "\r", with: "\\r")   // Escape carriage returns
                
                let script = """
                    (function() {
                        try {
                            if (document.head) {
                                var style = document.createElement('style');
                                style.innerHTML = '\(escapedCSS)';
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

