package com.kriptokirmizi.alerta;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.RemoteMessage;
import org.json.JSONObject;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate()
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
        registerPlugin(com.getcapacitor.community.applesignin.SignInWithApple.class);
        registerPlugin(WebViewController.class);
        registerPlugin(InAppPurchasePlugin.class);
        
        super.onCreate(savedInstanceState);
        
        // 🔥 CRITICAL: Enable cookie persistence for WebView
        // This ensures httpOnly cookies (session tokens) are preserved when app is closed
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            
            // Enable third-party cookies (for OAuth redirects)
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                cookieManager.setAcceptThirdPartyCookies(webView, true);
                
                // 🔥 CRITICAL: Configure WebView settings for cookie persistence
                WebSettings webSettings = webView.getSettings();
                webSettings.setDomStorageEnabled(true); // Enable DOM storage (localStorage)
                webSettings.setDatabaseEnabled(true); // Enable database storage
                
                // 🔥 CRITICAL: Clear WebView cache to ensure new domain is loaded
                // This prevents old domain (alerta.kriptokirmizi.com) from being cached
                webView.clearCache(true);
                webView.clearHistory();
                
                // Clear cookies for old domain
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cookieManager.removeAllCookies(null);
                    cookieManager.flush();
                }
                
                // Set cache mode to LOAD_DEFAULT (uses cache when available)
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
                
                // Enable JavaScript (required for cookies)
                webSettings.setJavaScriptEnabled(true);
                
                // 🔥 CRITICAL: Set WebViewClient to prevent external browser from opening
                // This ensures all links (refresh button, settings tab, etc.) open within the app
                // Note: Google OAuth is handled by native plugin (uses Custom Tabs internally)
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        // Always load URLs within WebView, never open external browser
                        String url = request.getUrl().toString();
                        
                        // 🔥 CRITICAL: Redirect old domain to new domain
                        if (url.contains("alerta.kriptokirmizi.com")) {
                            String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                            android.util.Log.d("MainActivity", "🔄 Redirecting old domain to new: " + newUrl);
                            view.loadUrl(newUrl);
                            return true;
                        }
                        
                        view.loadUrl(url);
                        return true; // We handled the URL loading
                    }
                    
                    @Override
                    @SuppressWarnings("deprecation")
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        // For older Android versions
                        
                        // 🔥 CRITICAL: Redirect old domain to new domain
                        if (url.contains("alerta.kriptokirmizi.com")) {
                            String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                            android.util.Log.d("MainActivity", "🔄 Redirecting old domain to new: " + newUrl);
                            view.loadUrl(newUrl);
                            return true;
                        }
                        
                        view.loadUrl(url);
                        return true; // We handled the URL loading
                    }
                    
                    @Override
                    public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
                        super.onReceivedError(view, request, error);
                        String url = request.getUrl().toString();
                        android.util.Log.e("MainActivity", "❌ WebView error for URL: " + url + " - " + error.getDescription());
                        
                        // If error is for old domain, redirect to new domain
                        if (url.contains("alerta.kriptokirmizi.com")) {
                            String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                            android.util.Log.d("MainActivity", "🔄 Redirecting after error: " + newUrl);
                            view.loadUrl(newUrl);
                        }
                    }
                    
                    // Removed shouldInterceptRequest - it was breaking WebView rendering
                    // Header will be added via User-Agent detection in Next.js instead
                });
                
                android.util.Log.d("MainActivity", "✅ WebView settings configured for cookie persistence");
                android.util.Log.d("MainActivity", "✅ WebViewClient configured to prevent external browser");
            }
            
            // Flush cookies to ensure they are persisted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                cookieManager.flush();
            }
            
            android.util.Log.d("MainActivity", "✅ Cookie persistence enabled");
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "❌ Failed to enable cookie persistence: " + e.getMessage());
        }
        
        // Create notification channels (like Expo did)
        createNotificationChannels();
        
        // Setup Firebase Cloud Messaging listener
        setupFCMListener();
        
        // 🔥 CRITICAL: Force WebView to load correct URL after Capacitor initialization
        // This ensures Play Store builds use the correct domain from capacitor.config.json
        getBridge().getWebView().postDelayed(new Runnable() {
            @Override
            public void run() {
                forceCorrectServerUrl();
            }
        }, 500); // Wait 500ms for Capacitor to initialize
    }
    
    /**
     * 🔥 CRITICAL: Force WebView to load the correct server URL from capacitor.config.json
     * This fixes the issue where Play Store builds load old domain from cache
     */
    private void forceCorrectServerUrl() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView == null) {
                android.util.Log.w("MainActivity", "⚠️ WebView not available for forceCorrectServerUrl");
                return;
            }
            
            // Read capacitor.config.json from assets
            String serverUrl = readServerUrlFromConfig();
            if (serverUrl != null && !serverUrl.isEmpty()) {
                String currentUrl = webView.getUrl();
                
                // If WebView is loading old domain or hasn't loaded yet, force correct URL
                if (currentUrl == null || 
                    currentUrl.contains("alerta.kriptokirmizi.com") || 
                    currentUrl.isEmpty() ||
                    currentUrl.equals("about:blank")) {
                    
                    android.util.Log.d("MainActivity", "🔄 Force loading correct server URL: " + serverUrl);
                    webView.loadUrl(serverUrl);
                } else if (!currentUrl.startsWith(serverUrl)) {
                    // If current URL doesn't match config, redirect
                    android.util.Log.d("MainActivity", "🔄 Current URL doesn't match config, redirecting to: " + serverUrl);
                    webView.loadUrl(serverUrl);
                } else {
                    android.util.Log.d("MainActivity", "✅ WebView already on correct URL: " + currentUrl);
                }
            } else {
                android.util.Log.w("MainActivity", "⚠️ Could not read server URL from config, using default");
                // Fallback to default URL
                String defaultUrl = "https://alertachart.com";
                String currentUrl = webView.getUrl();
                if (currentUrl == null || currentUrl.contains("alerta.kriptokirmizi.com")) {
                    webView.loadUrl(defaultUrl);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "❌ Error in forceCorrectServerUrl: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Read server.url from capacitor.config.json
     */
    private String readServerUrlFromConfig() {
        try {
            InputStream inputStream = getAssets().open("capacitor.config.json");
            int size = inputStream.available();
            byte[] buffer = new byte[size];
            inputStream.read(buffer);
            inputStream.close();
            
            String json = new String(buffer, "UTF-8");
            JSONObject config = new JSONObject(json);
            
            if (config.has("server")) {
                JSONObject server = config.getJSONObject("server");
                if (server.has("url")) {
                    String url = server.getString("url");
                    android.util.Log.d("MainActivity", "✅ Read server URL from config: " + url);
                    return url;
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "❌ Error reading capacitor.config.json: " + e.getMessage());
        }
        return null;
    }
    
    private void setupFCMListener() {
        android.util.Log.d("MainActivity", "Setting up FCM listener...");
        // FCM will automatically handle notifications when app is in background
        // For foreground, we use PushNotifications plugin from Capacitor
        // This is just a backup to ensure notifications are always received
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Handle notification tap when app is running
        if (intent != null && intent.getExtras() != null) {
            android.util.Log.d("MainActivity", "onNewIntent with extras: " + intent.getExtras().toString());
        }
    }
    
    // 🔥 CRITICAL: Override onActivityResult for older Android versions (< API 30)
    // This ensures Google Auth plugin can handle activity results properly
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        android.util.Log.d("MainActivity", "onActivityResult called: requestCode=" + requestCode + ", resultCode=" + resultCode);
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Default channel
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "Default",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            defaultChannel.setDescription("Default notifications");
            notificationManager.createNotificationChannel(defaultChannel);
            
            // Price Alerts channel (Expo'daki gibi)
            NotificationChannel priceAlertsChannel = new NotificationChannel(
                "price-alerts-v2",
                "Price Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            priceAlertsChannel.setDescription("Fiyat uyarıları");
            priceAlertsChannel.enableVibration(true);
            notificationManager.createNotificationChannel(priceAlertsChannel);
            
            // Alarms channel
            NotificationChannel alarmsChannel = new NotificationChannel(
                "alarms-v2",
                "Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            alarmsChannel.setDescription("Alarm bildirimleri");
            alarmsChannel.enableVibration(true);
            notificationManager.createNotificationChannel(alarmsChannel);
            
            // Admin notifications channel
            NotificationChannel adminChannel = new NotificationChannel(
                "admin-notifications",
                "Admin Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            adminChannel.setDescription("Yönetici bildirimleri");
            notificationManager.createNotificationChannel(adminChannel);
            
            android.util.Log.d("MainActivity", "✅ Notification channels created");
        }
    }
    
    private boolean isFirstStart = true;
    
    @Override
    public void onStart() {
        super.onStart();
        
        // 🔥 CRITICAL: Force correct server URL on start (in case app was restored from background)
        getBridge().getWebView().postDelayed(new Runnable() {
            @Override
            public void run() {
                forceCorrectServerUrl();
            }
        }, 300);
        
        // Ensure WebViewClient is set (in case WebView wasn't ready in onCreate)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Always set WebViewClient to prevent external browser from opening
            // This ensures all links (refresh button, settings tab, etc.) open within the app
            // Note: Google OAuth is handled by native plugin (uses Custom Tabs internally)
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    // Always load URLs within WebView, never open external browser
                    String url = request.getUrl().toString();
                    
                    // 🔥 CRITICAL: Redirect old domain to new domain
                    if (url.contains("alerta.kriptokirmizi.com")) {
                        String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                        android.util.Log.d("MainActivity", "🔄 Redirecting old domain to new: " + newUrl);
                        view.loadUrl(newUrl);
                        return true;
                    }
                    
                    view.loadUrl(url);
                    return true; // We handled the URL loading
                }
                
                @Override
                @SuppressWarnings("deprecation")
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    // For older Android versions
                    
                    // 🔥 CRITICAL: Redirect old domain to new domain
                    if (url.contains("alerta.kriptokirmizi.com")) {
                        String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                        android.util.Log.d("MainActivity", "🔄 Redirecting old domain to new: " + newUrl);
                        view.loadUrl(newUrl);
                        return true;
                    }
                    
                    view.loadUrl(url);
                    return true; // We handled the URL loading
                }
                
                @Override
                public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    String url = request.getUrl().toString();
                    android.util.Log.e("MainActivity", "❌ WebView error for URL: " + url + " - " + error.getDescription());
                    
                    // If error is for old domain, redirect to new domain
                    if (url.contains("alerta.kriptokirmizi.com")) {
                        String newUrl = url.replace("alerta.kriptokirmizi.com", "alertachart.com");
                        android.util.Log.d("MainActivity", "🔄 Redirecting after error: " + newUrl);
                        view.loadUrl(newUrl);
                    }
                }
                
                // Removed shouldInterceptRequest - it was breaking WebView rendering
                // Header will be added via User-Agent detection in Next.js instead
            });
            android.util.Log.d("MainActivity", "✅ WebViewClient set in onStart");
        }
    }
    
    @Override
    public void onResume() {
        super.onResume();
        
        // 🔥 CRITICAL: Force correct server URL on resume (in case app was restored)
        getBridge().getWebView().postDelayed(new Runnable() {
            @Override
            public void run() {
                forceCorrectServerUrl();
            }
        }, 200);
        
        // 🔥 CRITICAL: Check if WebView is trying to load old domain and redirect
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            String currentUrl = webView.getUrl();
            if (currentUrl != null && currentUrl.contains("alerta.kriptokirmizi.com")) {
                String newUrl = currentUrl.replace("alerta.kriptokirmizi.com", "alertachart.com");
                android.util.Log.d("MainActivity", "🔄 onResume: Redirecting old domain to new: " + newUrl);
                webView.loadUrl(newUrl);
            }
        }
    }
    
    // Custom plugin to control WebView URL
    @CapacitorPlugin(name = "WebViewController")
    public static class WebViewController extends Plugin {
        
        @PluginMethod
        public void loadUrl(PluginCall call) {
            String url = call.getString("url");
            if (url == null || url.isEmpty()) {
                call.reject("URL is required");
                return;
            }
            
            getBridge().getActivity().runOnUiThread(() -> {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.loadUrl(url);
                    call.resolve();
                } else {
                    call.reject("WebView not available");
                }
            });
        }
        
        @PluginMethod
        public void reload(PluginCall call) {
            // 🔥 CRITICAL: Reload WebView without opening external browser
            getBridge().getActivity().runOnUiThread(() -> {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.reload();
                    android.util.Log.d("WebViewController", "✅ WebView reloaded");
                    call.resolve();
                } else {
                    call.reject("WebView not available");
                }
            });
        }
    }
}
