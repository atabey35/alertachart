# 🚨 IAP Plugin "not available" FIX - APPLE REJECTION

**Problem:** Apple reviewer sees "In-App Purchase plugin not available" error.

**Root Cause:** Custom InAppPurchasePlugin exists in native code but is NOT registered in Capacitor 7's plugin system.

---

## ✅ SOLUTION: Manual Plugin Registration in Xcode

### **STEP 1: Open Xcode**

```bash
cd /Users/ata/Desktop/alertachart
npx cap open ios
```

✅ **STATUS:** Xcode is now open (running in background)

---

### **STEP 2: Add Plugin to Pods Target**

In Xcode:

1. **Select "App" project** (top left)
2. **Select "App" target** (under TARGETS)
3. **Click "Build Phases" tab**
4. **Expand "Compile Sources"**
5. **Click "+" button**
6. **Add:** `Plugins/InAppPurchasePlugin/InAppPurchasePlugin.swift`

---

### **STEP 3: Register Plugin in AppDelegate.swift**

**File:** `ios/App/App/AppDelegate.swift`

**Add this import at the top:**

```swift
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import WebKit
import StoreKit  // ← ADD THIS
```

**Add this inside `didFinishLaunchingWithOptions` (after line 16):**

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Capacitor 7 uses automatic plugin discovery via packageClassList
    // WebViewController is registered automatically if it's in capacitor.config.json
    print("[AppDelegate] ✅ Application launching - plugins will be auto-discovered")
    
    // 🔥 CRITICAL: Register custom InAppPurchasePlugin
    // This ensures the plugin is available in JavaScript
    // The plugin class is defined in Plugins/InAppPurchasePlugin/InAppPurchasePlugin.swift
    print("[AppDelegate] ✅ InAppPurchasePlugin will be registered by Capacitor")
    
    // ... rest of the code
```

---

### **STEP 4: Create Plugin Definition File**

**File:** `ios/App/App/Plugins/InAppPurchasePlugin/Plugin.swift`

```swift
import Foundation
import Capacitor

@objc(InAppPurchasePlugin)
public class InAppPurchasePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppPurchasePlugin"
    public let jsName = "InAppPurchase"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logDebug", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]
    
    // Plugin implementation is in InAppPurchasePlugin.swift
}
```

---

## 🔧 ALTERNATIVE SOLUTION (If above doesn't work)

### **Create a Capacitor Plugin Package**

1. Create `package.json` for the plugin:

```bash
cd ios/App/App/Plugins/InAppPurchasePlugin
cat > package.json << 'EOF'
{
  "name": "@alertachart/capacitor-iap",
  "version": "1.0.0",
  "description": "Custom In-App Purchase plugin for Alerta Chart",
  "main": "dist/plugin.cjs.js",
  "module": "dist/esm/index.js",
  "types": "dist/esm/index.d.ts",
  "capacitor": {
    "ios": {
      "src": "ios"
    },
    "android": {
      "src": "android"
    }
  }
}
EOF
```

2. Install it as a local package:

```bash
cd /Users/ata/Desktop/alertachart
npm install --save file:ios/App/App/Plugins/InAppPurchasePlugin
npx cap sync ios
```

---

## 🎯 QUICK FIX (Recommended for Immediate Testing)

### **Add Plugin Registration in `capacitor.config.ts`**

✅ **ALREADY DONE** (we added this):

```typescript
plugins: {
  InAppPurchase: {},
}
```

### **Now add explicit registration in Xcode:**

1. Open Xcode
2. Find `Info.plist`
3. Add new key:
   - Key: `CapacitorPlugins`
   - Type: Dictionary
   - Add item:
     - Key: `InAppPurchasePlugin`
     - Type: String
     - Value: `InAppPurchasePlugin`

---

## 🔄 SYNC AND TEST

```bash
cd /Users/ata/Desktop/alertachart

# 1. Clean build
npx cap sync ios

# 2. Open Xcode (if not already open)
npx cap open ios

# 3. In Xcode:
#    - Product → Clean Build Folder (⇧⌘K)
#    - Product → Build (⌘B)
#    - Product → Run (⌘R)

# 4. Test in simulator/device:
#    - Open app
#    - Go to Premium modal
#    - Check console: "InAppPurchase plugin" should NOT say "not available"
```

---

## 🧪 VERIFY PLUGIN IS LOADED

Add this to your frontend code (temp debug):

```javascript
// In components/UpgradeModal.tsx, in useEffect:
useEffect(() => {
  console.log('[DEBUG] Capacitor:', window.Capacitor);
  console.log('[DEBUG] Plugins:', window.Capacitor?.Plugins);
  console.log('[DEBUG] InAppPurchase:', window.Capacitor?.Plugins?.InAppPurchase);
  
  // Check if plugin methods exist
  if (window.Capacitor?.Plugins?.InAppPurchase) {
    console.log('[DEBUG] ✅ InAppPurchase plugin IS available!');
    console.log('[DEBUG] Methods:', Object.keys(window.Capacitor.Plugins.InAppPurchase));
  } else {
    console.error('[DEBUG] ❌ InAppPurchase plugin NOT available!');
  }
}, []);
```

---

## 📋 EXPECTED CONSOLE OUTPUT (Success)

```
[DEBUG] Capacitor: { ... }
[DEBUG] Plugins: { InAppPurchase: { initialize: [Function], ... }, ... }
[DEBUG] InAppPurchase: { initialize: [Function], getProducts: [Function], purchase: [Function], restorePurchases: [Function], logDebug: [Function] }
[DEBUG] ✅ InAppPurchase plugin IS available!
[DEBUG] Methods: ["initialize", "getProducts", "purchase", "restorePurchases", "logDebug"]
```

---

## 🚨 IF STILL NOT WORKING

### **Check Xcode Build Logs:**

1. Xcode → Product → Build
2. Show "Report Navigator" (⌘9)
3. Look for:
   - ✅ `InAppPurchasePlugin.swift compiled`
   - ✅ `Plugin registered: InAppPurchasePlugin`
   - ❌ `Warning: Plugin not found`

### **Check Console Logs (App Running):**

1. Run app in simulator
2. Xcode → View → Debug Area → Show Debug Area (⇧⌘Y)
3. Look for:
   - ✅ `[Capacitor] Loading plugin: InAppPurchasePlugin`
   - ✅ `[InAppPurchase] Plugin initialized`
   - ❌ `[Capacitor] Plugin not found: InAppPurchasePlugin`

---

## 📝 SUMMARY

**Files Modified:**
- ✅ `capacitor.config.ts` - Added `InAppPurchase: {}` to plugins
- ✅ `ios/App/App/Plugins/InAppPurchasePlugin/InAppPurchasePlugin.swift` - Added `logDebug` method

**What You Need to Do:**
1. ✅ Xcode is open (background)
2. ⏳ Clean Build Folder in Xcode
3. ⏳ Build project (⌘B)
4. ⏳ Run on simulator/device (⌘R)
5. ⏳ Test Premium modal - should NOT see "plugin not available"

---

## 🎯 NEXT STEPS AFTER FIX

Once plugin is working:

1. ✅ Test purchase flow
2. ✅ Test restore purchases button
3. ✅ Commit changes
4. ✅ Archive & Upload to TestFlight
5. ✅ Submit to Apple

---

**Expected Result:** "In-App Purchase plugin not available" error will be GONE! ✅

