# Google Sign-In Error Code 10 (DEVELOPER_ERROR) - Fix Guide

## 🔴 Problem

You're getting error code **10 (DEVELOPER_ERROR)** when trying to sign in with Google on Android:

```
Error: Something went wrong
Code: 10
```

This error means:
- SHA-1 fingerprint mismatch
- OAuth client ID not properly configured
- Package name mismatch

## ✅ Solution Steps

### Step 1: Get Your Device's SHA-1 Fingerprint

Since you're testing on a **physical device** (Redmi Note 8), you need to get the **debug keystore SHA-1**:

```bash
# On macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# On Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

**Copy the SHA-1 value** (format: `XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX`)

### Step 2: Add SHA-1 to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **alerta-b8df2**
3. Click **⚙️ Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Find your Android app: **com.kriptokirmizi.alerta**
6. Click **Add fingerprint** button
7. Paste your debug SHA-1 fingerprint
8. Click **Save**

### Step 3: Add SHA-1 to Google Cloud Console OAuth Client (CRITICAL!)

**This is the most important step!** Firebase alone is not enough.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **alerta-b8df2** (or your project)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** for Android:
   - Name: Should be something like "Alerta Chart - Android"
   - Client ID: `776781271347-fgnaoenplt1lnnmjivcagc013fa01ch1.apps.googleusercontent.com`
5. Click on the client ID to edit it
6. In the **SHA-1 certificate fingerprint** section, click **Add fingerprint**
7. Paste your debug SHA-1 fingerprint
8. **Important:** Keep all existing SHA-1 fingerprints (don't delete them):
   - Upload key SHA-1: `03:7C:A0:05:9F:C1:0C:C7:86:95:8C:27:94:95:67:D7:CC:0C:FA:F2`
   - Google Play App Signing SHA-1: `10:76:D8:08:ED:F5:EB:6B:19:E6:96:12:76:EA:A1:CC:B6:98:E7:99`
   - **Add your debug SHA-1** (for testing on physical devices)
9. Click **Save**

### Step 4: Download Updated google-services.json

1. Go back to Firebase Console → **Project Settings**
2. Scroll to **Your apps** → Android app
3. Click **google-services.json** download button
4. Replace `android/app/google-services.json` with the new file

### Step 5: Rebuild and Test

```bash
# Clean build
cd android
./gradlew clean

# Build new APK
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🔍 Verify Configuration

### Check Firebase SHA-1 List

Firebase Console → Project Settings → Your apps → Android app → **SHA certificate fingerprints**

Should include:
- ✅ Debug keystore SHA-1 (for testing)
- ✅ Upload key SHA-1 (for APK builds)
- ✅ Google Play App Signing SHA-1 (for Play Store)

### Check Google Cloud Console OAuth Client

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Android client

**SHA-1 certificate fingerprint** section should include:
- ✅ Debug keystore SHA-1 (for testing)
- ✅ Upload key SHA-1 (for APK builds)
- ✅ Google Play App Signing SHA-1 (for Play Store)

## 🚨 Common Issues

### Issue 1: "Still getting error code 10 after adding SHA-1"

**Solution:**
1. Make sure you added SHA-1 to **BOTH** Firebase AND Google Cloud Console
2. Wait 5-10 minutes for changes to propagate
3. Download fresh `google-services.json`
4. Rebuild the app completely (clean build)

### Issue 2: "Which SHA-1 should I use?"

**For testing on physical device:**
- Use **debug keystore SHA-1** (from `~/.android/debug.keystore`)

**For release APK:**
- Use **upload key SHA-1** (from your release keystore)

**For Google Play Store:**
- Use **Google Play App Signing SHA-1** (from Play Console)

**Best practice:** Add all three SHA-1 fingerprints to both Firebase and Google Cloud Console!

### Issue 3: "Package name mismatch"

Verify package name matches:
- `android/app/build.gradle`: `applicationId "com.kriptokirmizi.alerta"`
- `google-services.json`: `"package_name": "com.kriptokirmizi.alerta"`
- Google Cloud Console OAuth Client: `com.kriptokirmizi.alerta`

## 📋 Quick Checklist

- [ ] Got debug keystore SHA-1 fingerprint
- [ ] Added SHA-1 to Firebase Console
- [ ] Added SHA-1 to Google Cloud Console OAuth Client (Android)
- [ ] Downloaded fresh `google-services.json`
- [ ] Replaced `android/app/google-services.json`
- [ ] Clean rebuild: `./gradlew clean`
- [ ] Installed new APK on device
- [ ] Tested Google Sign-In

## 🔧 Debug Commands

### Get Debug Keystore SHA-1
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

### Get Release Keystore SHA-1
```bash
cd android/app
keytool -list -v -keystore upload-key.keystore -alias upload | grep SHA1
```

### Check Current google-services.json SHA-1
```bash
cat android/app/google-services.json | grep certificate_hash
```

## 📚 Additional Resources

- [Firebase SHA-1 Configuration](https://firebase.google.com/docs/android/setup#add-sha)
- [Google Sign-In Error Codes](https://developers.google.com/android/reference/com/google/android/gms/auth/api/signin/GoogleSignInStatusCodes)
- [OAuth 2.0 Client Configuration](https://console.cloud.google.com/apis/credentials)

