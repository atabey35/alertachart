package com.kriptokirmizi.alerta;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE super.onCreate()
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
        registerPlugin(com.getcapacitor.community.applesignin.SignInWithApple.class);
        registerPlugin(WebViewController.class);
        
        super.onCreate(savedInstanceState);
        
        // Create notification channels (like Expo did)
        createNotificationChannels();
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
    }
}
