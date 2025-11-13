const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Apple Developer bilgileriniz
const TEAM_ID = 'P6NB9T5SQ9'; // Membership'ten aldığınız Team ID
const CLIENT_ID = 'com.kriptokirmizi.alerta.signin'; // Services ID
const KEY_ID = '9N6QAL7HHC'; // Key oluştururken aldığınız Key ID
const PRIVATE_KEY_PATH = path.join(__dirname, 'AuthKey_9N6QAL7HHC.p8');

try {
  // Private key'i oku
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  // JWT token oluştur
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d', // 6 ay geçerli
    audience: 'https://appleid.apple.com',
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    header: {
      alg: 'ES256',
      kid: KEY_ID,
    },
  });

  console.log('\n✅ Apple Client Secret başarıyla oluşturuldu!\n');
  console.log('📋 .env.local dosyanıza ekleyin:\n');
  console.log('APPLE_CLIENT_SECRET=' + token);
  console.log('\n⏰ Bu token 180 gün geçerlidir.\n');
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.error('\n💡 Kontrol edin:');
  console.error('  - AuthKey_9N6QAL7HHC.p8 dosyası scripts/ klasöründe mi?');
  console.error('  - TEAM_ID, CLIENT_ID, KEY_ID doğru mu?');
}