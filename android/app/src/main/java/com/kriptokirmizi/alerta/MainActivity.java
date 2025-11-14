package com.kriptokirmizi.alerta;

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
