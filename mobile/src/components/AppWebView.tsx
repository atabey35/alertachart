import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Platform, BackHandler, Alert, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import Constants from 'expo-constants';
import { INJECTED_JAVASCRIPT, parseWebMessage, sendMessageToWeb } from '../utils/bridge';

// Production URL
// Constants.executionEnvironment: 'storeClient' (production), 'standalone' (development build), undefined (Expo Go)
// Production build'de __DEV__ false olmalı
// Expo Go'da da production URL kullan (local development için development build kullanılmalı)
// Sadece development build'de (standalone) local URL kullan
const isDevelopmentBuild = Constants.executionEnvironment === 'standalone' && __DEV__;
// Geçici olarak her zaman production URL kullan (localhost çalışmıyor)
const WEBVIEW_URL = 'https://alerta.kriptokirmizi.com';

interface AppWebViewProps {
  pushToken: string | null;
  deviceId: string | null;
  authToken?: string | null;
  onAuthToken?: (token: string) => void;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
  onError?: (error: any) => void;
}

export default function AppWebView({ 
  pushToken, 
  deviceId,
  authToken,
  onAuthToken,
  onNavigationStateChange,
  onError 
}: AppWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEBVIEW_URL);

  // Android back button handler
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true; // Event handled
        }
        return false; // Let system handle (app exit)
      });

      return () => backHandler.remove();
    }
  }, [canGoBack]);

  // Push token değiştiğinde web'e gönder
  useEffect(() => {
    if (pushToken && webViewRef.current) {
      console.log('[AppWebView] Sending PUSH_TOKEN to web:', pushToken);
      sendMessageToWeb(webViewRef.current, {
        type: 'PUSH_TOKEN',
        token: pushToken,
      });
    }
  }, [pushToken]);

  // Auth token değiştiğinde web'e gönder (uygulama açıldığında veya giriş yapıldığında)
  useEffect(() => {
    if (authToken && webViewRef.current) {
      console.log('[AppWebView] Sending AUTH_TOKEN to web (restored from storage)');
      sendMessageToWeb(webViewRef.current, {
        type: 'AUTH_TOKEN',
        token: authToken,
      });
    }
  }, [authToken]);

  // Device ID değiştiğinde web'e gönder (birden fazla kez gönder, güvenilirlik için)
  useEffect(() => {
    if (deviceId && webViewRef.current) {
      console.log('[AppWebView] Sending DEVICE_ID to web:', deviceId);
      
      // İlk gönderim - hemen
      sendMessageToWeb(webViewRef.current, {
        type: 'DEVICE_ID',
        deviceId: deviceId,
      });
      
      // İkinci gönderim - 1 saniye sonra
      const timer1 = setTimeout(() => {
        if (webViewRef.current) {
          console.log('[AppWebView] Re-sending DEVICE_ID (1s delay):', deviceId);
          sendMessageToWeb(webViewRef.current, {
            type: 'DEVICE_ID',
            deviceId: deviceId,
          });
        }
      }, 1000);
      
      // Üçüncü gönderim - 3 saniye sonra
      const timer2 = setTimeout(() => {
        if (webViewRef.current) {
          console.log('[AppWebView] Re-sending DEVICE_ID (3s delay):', deviceId);
          sendMessageToWeb(webViewRef.current, {
            type: 'DEVICE_ID',
            deviceId: deviceId,
          });
        }
      }, 3000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [deviceId]);

  // Safe area bilgisini web'e gönder (Android sistem navigasyon çubuğu için)
  useEffect(() => {
    if (webViewRef.current) {
      // Android sistem navigasyon çubuğu için sabit padding (genellikle 48-56dp)
      // React Native'de dp = px (1:1 ratio)
      const bottomInset = Platform.OS === 'android' ? 56 : 0; // Android için 56dp, iOS için 0 (iOS safe area kullanır)
      
      console.log('[AppWebView] Sending SAFE_AREA_INSETS to web:', { bottom: bottomInset });
      sendMessageToWeb(webViewRef.current, {
        type: 'SAFE_AREA_INSETS',
        insets: {
          bottom: bottomInset,
        },
      });
    }
  }, []);
  
  // WebView yüklendiğinde deviceId, authToken ve safe area bilgisini gönder
  const handleLoadEnd = () => {
    if (deviceId && webViewRef.current) {
      console.log('[AppWebView] WebView loadEnd, sending DEVICE_ID:', deviceId);
      sendMessageToWeb(webViewRef.current, {
        type: 'DEVICE_ID',
        deviceId: deviceId,
      });
    }
    
    // Auth token varsa gönder (uygulama yeniden açıldığında)
    if (authToken && webViewRef.current) {
      console.log('[AppWebView] WebView loadEnd, sending AUTH_TOKEN (restored from storage)');
      sendMessageToWeb(webViewRef.current, {
        type: 'AUTH_TOKEN',
        token: authToken,
      });
    }
    
    // Safe area bilgisini gönder (Android sistem navigasyon çubuğu için)
    if (webViewRef.current) {
      const bottomInset = Platform.OS === 'android' ? 56 : 0;
      console.log('[AppWebView] WebView loadEnd, sending SAFE_AREA_INSETS:', { bottom: bottomInset });
      sendMessageToWeb(webViewRef.current, {
        type: 'SAFE_AREA_INSETS',
        insets: {
          bottom: bottomInset,
        },
      });
    }
  };

  const handleMessage = (event: any) => {
    const message = parseWebMessage(event);
    if (!message) return;

    console.log('[WebView] Message from web:', message);

    switch (message.type) {
      case 'REQUEST_PUSH_TOKEN':
        // Web, push token istiyor
        if (pushToken) {
          sendMessageToWeb(webViewRef.current, {
            type: 'PUSH_TOKEN',
            token: pushToken,
          });
        }
        break;

      case 'AUTH_TOKEN':
        // Web'den auth token geldi - native tarafa ilet
        if (message.payload?.token) {
          console.log('[WebView] Auth token received from web');
          onAuthToken?.(message.payload.token);
        } else if (message.token) {
          // Fallback: token direkt message'da olabilir
          console.log('[WebView] Auth token received from web (fallback)');
          onAuthToken?.(message.token);
        }
        break;

      case 'NAVIGATION':
        // Web'den navigasyon talebi
        if (message.payload?.url) {
          setCurrentUrl(message.payload.url);
        }
        break;

      case 'CUSTOM':
        // Özel mesajlar için extension noktası
        console.log('[WebView] Custom message:', message.payload);
        break;
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    onNavigationStateChange?.(navState);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[WebView] Error:', nativeEvent);
    onError?.(nativeEvent);
    
    // Kullanıcıya hata göster
    Alert.alert(
      'Bağlantı Hatası',
      'Web sitesine bağlanılamadı. İnternet bağlantınızı kontrol edin.',
      [{ text: 'Tekrar Dene', onPress: () => webViewRef.current?.reload() }]
    );
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        
        // JavaScript & Injection
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={`
          ${INJECTED_JAVASCRIPT}
          // Set deviceId, isNativeApp flag and safe area insets immediately
          (function() {
            try {
              // Set isNativeApp flag
              window.isNativeApp = true;
              console.log('[Native Bridge] Set isNativeApp = true');
              
              // Set deviceId if available
              const deviceId = ${deviceId ? JSON.stringify(deviceId) : 'null'};
              if (deviceId) {
                console.log('[Native Bridge] Setting deviceId:', deviceId);
                window.dispatchEvent(new CustomEvent('nativeMessage', { 
                  detail: { type: 'DEVICE_ID', deviceId: deviceId } 
                }));
                // Also set it in window for direct access
                window.nativeDeviceId = deviceId;
                
                // Store in localStorage for persistence
                try {
                  localStorage.setItem('native_device_id', deviceId);
                  console.log('[Native Bridge] Stored deviceId in localStorage');
                } catch (e) {
                  console.error('[Native Bridge] Failed to store deviceId in localStorage:', e);
                }
              }
              
              // Set safe area insets (Android sistem navigasyon çubuğu için)
              const bottomInset = ${Platform.OS === 'android' ? 56 : 0};
              window.safeAreaInsets = { bottom: bottomInset };
              console.log('[Native Bridge] Set safeAreaInsets:', window.safeAreaInsets);
              
              // Apply safe area to CSS immediately
              const style = document.createElement('style');
              style.textContent = \`:root { --safe-area-inset-bottom: \${bottomInset}px; }\`;
              document.head.appendChild(style);
              
              // Dispatch event for web to listen
              window.dispatchEvent(new CustomEvent('nativeMessage', { 
                detail: { type: 'SAFE_AREA_INSETS', insets: { bottom: bottomInset } } 
              }));
            } catch (e) {
              console.error('[Native Bridge] Error in initialization:', e);
            }
          })();
          true;
        `}
        onMessage={handleMessage}
        
        // Navigation
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        
        // Refresh
        pullToRefreshEnabled={true}
        
        // Media & Files
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowFileAccess={true}
        
        // Security (https için güvenli, http için gerekli)
        mixedContentMode="always"
        
        // Performance
        cacheEnabled={true}
        
        // Error handling
        onError={handleError}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[WebView] HTTP Error:', nativeEvent.statusCode);
        }}
        
        
        // Loading
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            {/* Splash screen burada gösterilebilir */}
          </View>
        )}
        
        // iOS specific
        bounces={true}
        scrollEnabled={true}
        
        // Android specific
        {...Platform.select({
          android: {
            overScrollMode: 'always',
            nestedScrollEnabled: true,
          },
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

