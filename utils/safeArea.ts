/**
 * Safe Area utilities for native app
 * Handles safe area insets from React Native WebView
 */

let safeAreaInsets = {
  bottom: 0,
};

/**
 * Initialize safe area listener
 * Listens for SAFE_AREA_INSETS messages from native app
 */
export function initSafeAreaListener(): void {
  if (typeof window === 'undefined') return;

  // Listen for native messages
  window.addEventListener('nativeMessage', (event: any) => {
    const message = event.detail;
    if (message.type === 'SAFE_AREA_INSETS' && message.insets) {
      safeAreaInsets = message.insets;
      updateSafeAreaCSS();
      console.log('[SafeArea] Updated safe area insets:', safeAreaInsets);
    }
  });

  // Also listen for direct message events
  window.addEventListener('message', (event: MessageEvent) => {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (message.type === 'SAFE_AREA_INSETS' && message.insets) {
        safeAreaInsets = message.insets;
        updateSafeAreaCSS();
        console.log('[SafeArea] Updated safe area insets from message event:', safeAreaInsets);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  // Check if safe area insets are already set (from injected JavaScript)
  if ((window as any).safeAreaInsets) {
    safeAreaInsets = (window as any).safeAreaInsets;
    updateSafeAreaCSS();
    console.log('[SafeArea] Using pre-set safe area insets:', safeAreaInsets);
  }
}

/**
 * Update CSS custom property for safe area inset bottom
 */
function updateSafeAreaCSS(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const bottomInset = safeAreaInsets.bottom || 0;
  
  // Set CSS custom property
  root.style.setProperty('--safe-area-inset-bottom', `${bottomInset}px`);
  
  console.log('[SafeArea] Updated CSS variable --safe-area-inset-bottom:', `${bottomInset}px`);
}

/**
 * Get current safe area insets
 */
export function getSafeAreaInsets(): { bottom: number } {
  return { ...safeAreaInsets };
}

/**
 * Get safe area bottom inset in pixels
 */
export function getSafeAreaBottom(): number {
  return safeAreaInsets.bottom || 0;
}







