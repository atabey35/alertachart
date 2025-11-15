package com.kriptokirmizi.alerta;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.RemoteMessage;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate()
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
        registerPlugin(com.getcapacitor.community.applesignin.SignInWithApple.class);
        registerPlugin(WebViewController.class);
        
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
    public void onResume() {
        super.onResume();
        
        // Only reset on first start (app opened fresh), not on resume from background
        if (isFirstStart) {
            isFirstStart = false;
            
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                String currentUrl = webView.getUrl();
                android.util.Log.d("MainActivity", "Current URL on start: " + currentUrl);
                
                // If currently on remote URL, reset to local index.html
                if (currentUrl != null && (currentUrl.startsWith("https://alertachart.com") || currentUrl.startsWith("http://alertachart.com"))) {
                    runOnUiThread(() -> {
                        webView.loadUrl("http://localhost/index.html");
                        android.util.Log.d("MainActivity", "✅ Reset to local index.html from remote URL");
                    });
                }
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
