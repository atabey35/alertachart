import { WebToNativeMessage, NativeToWebMessage } from '../types';

/**
 * Native tarafından Web'e mesaj gönderme
 */
export function sendMessageToWeb(webViewRef: any, message: NativeToWebMessage): void {
  if (!webViewRef.current) return;
  
  // Use injectJavaScript to dispatch both message and nativeMessage events
  const script = `
    (function() {
      try {
        const message = ${JSON.stringify(message)};
        console.log('[Native Bridge] Sending message to web:', message);
        
        // Dispatch message event (for INJECTED_JAVASCRIPT listener)
        window.dispatchEvent(new MessageEvent('message', { data: message }));
        
        // Also dispatch nativeMessage event directly (for alertService)
        window.dispatchEvent(new CustomEvent('nativeMessage', { detail: message }));
        
        console.log('[Native Bridge] Message dispatched successfully');
      } catch (e) {
        console.error('[Bridge] Error dispatching event:', e);
      }
    })();
    true;
  `;
  
  webViewRef.current.injectJavaScript(script);
}

/**
 * Web'den Native'e gelen mesajları parse etme
 */
export function parseWebMessage(event: any): WebToNativeMessage | null {
  try {
    const data = typeof event.nativeEvent.data === 'string' 
      ? JSON.parse(event.nativeEvent.data)
      : event.nativeEvent.data;
    
    return data as WebToNativeMessage;
  } catch (error) {
    console.error('Failed to parse web message:', error);
    return null;
  }
}

/**
 * Web'e enjekte edilecek başlangıç scripti
 */
export const INJECTED_JAVASCRIPT = `
(function() {
  // Native köprüsü hazır
  window.isNativeApp = true;
  
  // Native'den mesaj almak için event listener
  window.addEventListener('message', function(event) {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      console.log('[Native Bridge] Received:', message);
      
      // Web uygulamasının dinleyebileceği custom event
      window.dispatchEvent(new CustomEvent('nativeMessage', { detail: message }));
    } catch (error) {
      console.error('[Native Bridge] Parse error:', error);
    }
  });
  
  // Native'e mesaj göndermek için helper
  window.sendToNative = function(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    }
  };
  
  // Push token isteme helper
  window.requestPushToken = function() {
    window.sendToNative('REQUEST_PUSH_TOKEN');
  };
  
  console.log('[Native Bridge] Initialized');
})();
true;
`;


