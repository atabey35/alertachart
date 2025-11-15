import UIKit
import Capacitor

// WebViewController Plugin for Capacitor 7
// Auto-discovered via packageClassList in capacitor.config.json
@objc(WebViewController)
public class WebViewController: CAPPlugin {
    
    public static let identifier = "WebViewController"
    public static let jsName = "WebViewController"
    
    public override func load() {
        print("[WebViewController] ✅ Plugin loaded and registered!")
        print("[WebViewController] 🔍 Bridge available:", self.bridge != nil)
        print("[WebViewController] 🔍 Identifier:", Self.identifier)
        super.load()
    }
    
    @objc public func open(_ call: CAPPluginCall) {
        print("[WebViewController] 🔍 open() called with:", call.options)
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
                // Direct load - navigation delegate will handle keeping it in WebView
                let request = URLRequest(url: url)
                webView.load(request)
                print("[WebViewController] ✅ URL opened (navigation delegate will handle):", urlString)
                call.resolve(["success": true])
            } else {
                print("[WebViewController] ❌ WebView not available")
                call.reject("WebView not available")
            }
        }
    }
    
    @objc public func loadUrl(_ call: CAPPluginCall) {
        print("[WebViewController] 🔍 loadUrl called with:", call.getString("url") ?? "nil")
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
                // Direct load - navigation delegate will handle keeping it in WebView
                let request = URLRequest(url: url)
                webView.load(request)
                print("[WebViewController] ✅ URL loaded (navigation delegate will handle):", urlString)
                call.resolve()
            } else {
                print("[WebViewController] ❌ WebView not available")
                call.reject("WebView not available")
            }
        }
    }
    
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
}

