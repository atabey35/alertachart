// Capacitor runtime initialization
// This file is automatically updated by Capacitor

// Initialize Capacitor
if (window.Capacitor) {
  console.log('[Capacitor] Runtime loaded');
  console.log('[Capacitor] Platform:', window.Capacitor.getPlatform());
  console.log('[Capacitor] isNativePlatform:', window.Capacitor.isNativePlatform());
  
  // Make Capacitor globally available
  window.isCapacitorApp = true;
}

