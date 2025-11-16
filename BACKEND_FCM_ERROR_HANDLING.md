# Backend FCM Error Handling Önerileri

## Sorun: `messaging/third-party-auth-error`

Backend'de FCM hatalarını daha iyi handle etmek için aşağıdaki iyileştirmeleri yapabilirsiniz:

## Önerilen İyileştirmeler

### 1. FCM Error Handling İyileştirmesi

Backend'deki FCM gönderme kodunda (muhtemelen `src/routes/admin.js` veya benzeri bir dosyada):

```javascript
// FCM gönderme işlemi
const response = await admin.messaging().sendToDevice(token, payload, options);

// Hata kontrolü
if (response.failureCount > 0) {
  const failedTokens = [];
  response.results.forEach((result, index) => {
    if (!result.success) {
      const token = tokens[index];
      const error = result.error;
      
      // Özel hata mesajları
      if (error?.code === 'messaging/third-party-auth-error') {
        console.error(`❌ APNs Authentication Error for token ${token.substring(0, 20)}...`);
        console.error('   This usually means:');
        console.error('   1. APNs key is not configured in Firebase Console');
        console.error('   2. APNs key is invalid or expired');
        console.error('   3. Bundle ID mismatch between Firebase and Xcode');
        console.error('   4. Team ID mismatch in Firebase Console');
        console.error('   Solution: Check FIREBASE_APNS_SETUP.md for detailed instructions');
      } else if (error?.code === 'messaging/invalid-registration-token') {
        console.error(`❌ Invalid token: ${token.substring(0, 20)}...`);
        // Token'ı veritabanından sil
        await removeTokenFromDatabase(token);
      } else if (error?.code === 'messaging/registration-token-not-registered') {
        console.error(`❌ Token not registered: ${token.substring(0, 20)}...`);
        // Token'ı veritabanından sil
        await removeTokenFromDatabase(token);
      } else {
        console.error(`❌ FCM Error for token ${token.substring(0, 20)}...:`, error);
      }
      
      failedTokens.push({ token, error: error?.message || 'Unknown error' });
    }
  });
  
  // Hatalı token'ları logla
  console.error(`⚠️ Failed to send to ${failedTokens.length} device(s)`);
}
```

### 2. Token Temizleme

Hatalı token'ları otomatik olarak temizleyin:

```javascript
async function removeTokenFromDatabase(token) {
  try {
    // Veritabanından token'ı sil
    await db.query('DELETE FROM devices WHERE fcm_token = ?', [token]);
    console.log(`✅ Removed invalid token from database: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('Error removing token from database:', error);
  }
}
```

### 3. Retry Mekanizması

Geçici hatalar için retry mekanizması ekleyin:

```javascript
async function sendNotificationWithRetry(tokens, payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await admin.messaging().sendToDevice(tokens, payload, options);
      
      if (response.failureCount === 0) {
        return { success: true, response };
      }
      
      // Geçici hatalar için retry
      const temporaryErrors = ['messaging/unavailable', 'messaging/internal-error'];
      const hasTemporaryError = response.results.some(result => 
        result.error && temporaryErrors.includes(result.error.code)
      );
      
      if (hasTemporaryError && attempt < maxRetries) {
        console.log(`⚠️ Temporary error, retrying... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      return { success: false, response };
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`⚠️ Error, retrying... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### 4. Detaylı Logging

FCM gönderme işlemlerini daha detaylı loglayın:

```javascript
console.log('📤 Broadcasting to', tokens.length, 'device(s)...');
console.log('   iOS devices:', iosTokens.length);
console.log('   Android devices:', androidTokens.length);
console.log('   First token example:', tokens[0]?.substring(0, 30) + '...');

// Platform bazlı token örnekleri
if (iosTokens.length > 0) {
  console.log('   iOS token examples:');
  iosTokens.slice(0, 3).forEach((token, index) => {
    console.log(`     ${index + 1}. FCM token: ${token.substring(0, 30)}...`);
  });
}
```

## Backend Dosya Konumları

Backend kodunuzu şu dosyalarda bulabilirsiniz:

- `src/routes/admin.js` - Admin broadcast endpoint
- `src/lib/push.js` veya `src/services/push.js` - FCM gönderme servisi
- `src/routes/push.js` - Push notification route'ları

## Test

1. Firebase Console'da APNs yapılandırmasını kontrol edin (FIREBASE_APNS_SETUP.md'ye bakın)
2. Admin panelinden bir broadcast gönderin
3. Backend log'larında detaylı hata mesajlarını kontrol edin
4. Hatalı token'ların otomatik olarak temizlendiğini doğrulayın

## Notlar

- `messaging/third-party-auth-error` hatası genellikle Firebase Console yapılandırması ile ilgilidir
- Bu hata, backend kodunda düzeltilemez - Firebase Console'da APNs key yapılandırması gerekir
- Hatalı token'ları temizlemek, veritabanını temiz tutar ve gereksiz istekleri önler

