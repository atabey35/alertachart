import Foundation
import Capacitor

/**
 * WebViewController Plugin
 * Custom Capacitor plugin to control WebView URL and reload
 */
@objc(WebViewControllerPlugin)
public class WebViewControllerPlugin: CAPPlugin {
    
    @objc func loadUrl(_ call: CAPPluginCall) {
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
                call.resolve()
            } else {
                call.reject("WebView not available")
            }
        }
    }
    
    @objc func reload(_ call: CAPPluginCall) {
        // 🔥 CRITICAL: Reload WebView without opening external browser
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
}

