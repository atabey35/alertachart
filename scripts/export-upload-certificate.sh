#!/bin/bash

# Upload Certificate Export Script
# Bu script upload key'in certificate'ini export eder

set -e

echo "📤 Upload Certificate Export"
echo "============================"
echo ""

cd "$(dirname "$0")/../android/app"

if [ ! -f "upload-key.keystore" ]; then
    echo "❌ upload-key.keystore dosyası bulunamadı!"
    echo "Önce upload key oluşturun:"
    echo "  keytool -genkey -v -keystore upload-key.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000"
    exit 1
fi

echo "📝 Certificate export ediliyor..."
echo "⚠️  Keystore şifresini girmeniz gerekecek"
echo ""

keytool -export -rfc -keystore upload-key.keystore -alias upload -file upload_certificate.pem

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificate başarıyla export edildi!"
    echo ""
    echo "📦 Dosya: android/app/upload_certificate.pem"
    echo ""
    echo "📤 Sonraki adımlar:"
    echo "1. Google Play Console → Setup → App signing"
    echo "2. 'Yükleme anahtarı sıfırlama isteğinde bulunma' tıklayın"
    echo "3. upload_certificate.pem dosyasını yükleyin"
    echo ""
else
    echo ""
    echo "❌ Certificate export başarısız!"
    exit 1
fi



