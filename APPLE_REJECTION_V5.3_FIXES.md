# Apple App Store Rejection Fixes - Version 5.3

**Date:** November 29, 2025  
**Version:** 5.3  
**Status:** ✅ COMPLETED

---

## 📋 Rejection Issues

Apple rejected Version 5.3 with two critical issues:

### 1. **Guideline 3.1.1 - Missing Restore Button**
> **Issue:** The Paywall/Subscription view is missing a "Restore Purchases" button.

### 2. **Guideline 2.1 - Receipt Validation Logic**
> **Issue:** The review team encounters an error when trying to buy the app. The server is not correctly handling the production/sandbox environment switch.

---

## ✅ FIXES IMPLEMENTED

### **FIX 1: Added "Restore Purchases" Button**

#### **Files Changed:**
1. **`services/iapService.ts`**
   - Added `restorePurchases()` function
   - Implements proper restore logic for iOS/Android
   - Handles empty purchase lists gracefully
   - Returns all restored purchases for backend verification

2. **`components/UpgradeModal.tsx`**
   - Imported `restorePurchases` and `RefreshCw` icon
   - Added `handleRestorePurchases()` function
   - Added "Restore Purchases" button in UI (only for iOS/Android)
   - Button is placed below the "Later" button
   - Includes loading state and proper error handling
   - Verifies each restored purchase with backend

#### **What the Code Does:**

**IAP Service (`services/iapService.ts`):**
```typescript
export async function restorePurchases(): Promise<{
  success: boolean;
  purchases?: any[];
  error?: string;
}>
```

- Calls native `plugin.restorePurchases()`
- Returns all previous purchases from Apple/Google
- Logs everything for debugging
- Handles "no purchases found" case (not an error)

**UpgradeModal (`components/UpgradeModal.tsx`):**
```typescript
const handleRestorePurchases = async () => {
  // 1. Call restorePurchases() from IAP service
  // 2. Get list of purchases
  // 3. Verify each purchase with backend (/api/subscription/verify-purchase)
  // 4. If any purchase is valid, activate premium and close modal
  // 5. Show success/error message
}
```

**UI Button:**
```tsx
<button onClick={handleRestorePurchases} ...>
  <RefreshCw className="w-3.5 h-3.5" />
  {language === 'tr' ? 'Satın Alımları Geri Yükle' : 'Restore Purchases'}
</button>
```

- Only shows on iOS/Android (not web)
- Disabled if IAP not available or loading
- Shows loading spinner during restore
- Blue text color (secondary action)

---

### **FIX 2: Enhanced Receipt Validation Logic**

#### **Files Changed:**
1. **`app/api/subscription/verify-purchase/route.ts`**
   - Enhanced `verifyAppleReceipt()` function
   - Added comprehensive logging for each step
   - Added helper functions for error messages
   - Improved handling of status 21007 (sandbox receipt)
   - Added handling of status 21008 (edge case)

#### **The Critical Logic Flow:**

```
1. ALWAYS try Production URL first
   └─> POST to: https://buy.itunes.apple.com/verifyReceipt
   
2. Check status code:
   ├─> Status 0: ✅ SUCCESS (Production receipt valid)
   │   └─> Extract expiry date and return
   │
   ├─> Status 21007: ⚠️ Sandbox receipt detected
   │   └─> IMMEDIATELY retry with Sandbox URL
   │       └─> POST to: https://sandbox.itunes.apple.com/verifyReceipt
   │       └─> Status 0: ✅ SUCCESS (Sandbox receipt valid)
   │       └─> Other: ❌ FAIL
   │
   └─> Other status: ❌ FAIL with specific error message
```

#### **Key Improvements:**

1. **Better Logging:**
   - Every step is logged with emoji indicators (🔄, ✅, ❌)
   - Production and Sandbox results are clearly labeled
   - Status codes are always logged

2. **Improved Error Messages:**
   - Separated `getProductionErrorMessage()` function
   - Separated `getSandboxErrorMessage()` function
   - All Apple status codes are documented

3. **Edge Case Handling:**
   - Status 21008 (production receipt to sandbox) is now handled
   - Network errors are caught and logged
   - Missing `APPLE_SHARED_SECRET` returns clear error

4. **Better Expiry Date Extraction:**
   - Checks `latest_receipt_info` first (most reliable)
   - Falls back to `receipt.in_app` if needed
   - Handles missing expiry dates gracefully

---

## 🧪 TESTING CHECKLIST

### **Test 1: Restore Purchases Button**

#### **iOS/Android:**
1. Open app on TestFlight/Play Store
2. Tap "Premium" button
3. Scroll to bottom of modal
4. ✅ Verify "Restore Purchases" button is visible
5. ✅ Verify button has refresh icon
6. ✅ Tap button (if no purchases: should show "No purchases found")
7. ✅ If previous purchase exists: should activate premium

#### **Web:**
1. Open app on web browser
2. Click "Premium" button
3. ✅ Verify "Restore Purchases" button is NOT visible (web doesn't support IAP)

---

### **Test 2: Receipt Validation**

#### **Sandbox Testing (TestFlight):**
1. Use Sandbox test account
2. Make a test purchase
3. Check server logs:
   ```
   [Verify Purchase] 🔄 Step 1: Trying PRODUCTION URL...
   [Verify Purchase] Production result status: 21007
   [Verify Purchase] ⚠️ Status 21007 detected (Sandbox receipt in production)
   [Verify Purchase] 🔄 Step 2: Trying SANDBOX URL...
   [Verify Purchase] Sandbox result status: 0
   [Verify Purchase] ✅ SANDBOX verification SUCCESS
   ```
4. ✅ Premium should be activated

#### **Production Testing (App Store):**
1. Make real purchase
2. Check server logs:
   ```
   [Verify Purchase] 🔄 Step 1: Trying PRODUCTION URL...
   [Verify Purchase] Production result status: 0
   [Verify Purchase] ✅ PRODUCTION verification SUCCESS
   ```
3. ✅ Premium should be activated

---

## 📝 BACKEND REQUIREMENTS

### **Environment Variables:**

**REQUIRED for iOS:**
```bash
APPLE_SHARED_SECRET=your_shared_secret_from_app_store_connect
```

**How to get it:**
1. Go to App Store Connect
2. Select your app
3. Go to "Subscriptions" or "In-App Purchases"
4. Click "App-Specific Shared Secret" or "Manage Shared Secret"
5. Generate or copy the secret
6. Add to Railway/Vercel environment variables

**Verify it's set:**
```bash
# On Railway
railway variables

# Check if APPLE_SHARED_SECRET is listed
```

---

## 🚨 IMPORTANT NOTES FOR APPLE REVIEW

### **What Changed:**

1. **Restore Button:**
   - Added "Restore Purchases" button as required by Guideline 3.1.1
   - Button is visible on all subscription/paywall screens
   - Button properly restores previous purchases

2. **Receipt Validation:**
   - Fixed production/sandbox environment handling
   - Server now correctly retries sandbox URL when status 21007 is returned
   - All Apple review purchases (sandbox) will now work correctly

### **How to Communicate to Apple:**

> **Resolution Summary:**
> 
> Thank you for your feedback. We have resolved both issues:
> 
> 1. **Guideline 3.1.1 - Restore Button:** We have added a "Restore Purchases" button to our subscription screen. The button is clearly visible below the purchase options and properly restores previously purchased subscriptions.
> 
> 2. **Guideline 2.1 - Receipt Validation:** We have enhanced our receipt validation logic to correctly handle the production/sandbox environment switch. Our server now:
>    - First attempts validation against the production URL
>    - If status 21007 is returned (sandbox receipt), automatically retries with the sandbox URL
>    - Properly validates and activates subscriptions from both environments
> 
> The app is now ready for re-review. Thank you for your patience.

---

## 📦 FILES MODIFIED

### **Core Changes:**
1. `services/iapService.ts` - Added `restorePurchases()` function
2. `components/UpgradeModal.tsx` - Added restore button and handler
3. `app/api/subscription/verify-purchase/route.ts` - Enhanced receipt validation

### **Documentation:**
4. `APPLE_REJECTION_V5.3_FIXES.md` (this file)

---

## ✅ DEPLOYMENT CHECKLIST

- [x] Code changes completed
- [ ] Verify `APPLE_SHARED_SECRET` is set in production
- [ ] Test restore button on TestFlight
- [ ] Test purchase flow on TestFlight
- [ ] Check logs for proper status code handling
- [ ] Build and upload new version to App Store Connect
- [ ] Submit for review with resolution notes

---

## 🎯 NEXT STEPS

1. **Verify Environment Variable:**
   ```bash
   # Check Railway
   railway variables | grep APPLE_SHARED_SECRET
   ```

2. **Build and Test:**
   ```bash
   # Build iOS app
   cd /Users/ata/Desktop/alertachart
   npm run build
   npx cap sync ios
   npx cap open ios
   
   # In Xcode:
   # - Archive the app
   # - Upload to App Store Connect
   ```

3. **TestFlight Testing:**
   - Install from TestFlight
   - Test "Restore Purchases" button
   - Make test purchase
   - Verify purchase activates premium

4. **Submit to Apple:**
   - Increment version to 5.4 (or keep 5.3 with new build number)
   - Add resolution notes (see above)
   - Submit for review

---

## 🔍 DEBUGGING

If Apple review still fails:

### **Check Logs:**
```bash
# Railway logs
railway logs --follow

# Look for:
[Verify Purchase] 🔄 Step 1: Trying PRODUCTION URL...
[Verify Purchase] Production result status: 21007
[Verify Purchase] 🔄 Step 2: Trying SANDBOX URL...
[Verify Purchase] ✅ SANDBOX verification SUCCESS
```

### **Common Issues:**

1. **"APPLE_SHARED_SECRET not configured"**
   - Solution: Add environment variable in Railway

2. **"Sandbox verification failed"**
   - Solution: Check that shared secret matches App Store Connect

3. **"Restore Purchases button not visible"**
   - Solution: Only shows on native apps (iOS/Android), not web

4. **"No purchases to restore"**
   - Solution: User must have made a previous purchase

---

## 📞 SUPPORT

If you encounter any issues:

1. Check Railway logs
2. Check TestFlight Console logs
3. Check Xcode Console (during TestFlight install)
4. Review this document

All fixes follow Apple's official guidelines and best practices.

---

**END OF DOCUMENT**

