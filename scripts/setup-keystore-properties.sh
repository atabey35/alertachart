#!/bin/bash

# Keystore Properties Setup Script
# Bu script keystore.properties dosyasını oluşturur

set -e

echo "🔐 Keystore Properties Setup"
echo "==========================="
echo ""

cd "$(dirname "$0")/../android"

if [ ! -f "app/upload-key.keystore" ]; then
    echo "❌ upload-key.keystore dosyası bulunamadı!"
    exit 1
fi

echo "📝 keystore.properties dosyası oluşturuluyor..."
echo ""

read -sp "Keystore password: " STORE_PASSWORD
echo
read -sp "Key password (genellikle aynı, boş bırakırsanız keystore password kullanılır): " KEY_PASSWORD
echo

# Eğer key password boşsa, store password kullan
if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD=$STORE_PASSWORD
fi

cat > keystore.properties << EOF
storeFile=app/upload-key.keystore
storePassword=$STORE_PASSWORD
keyAlias=upload
keyPassword=$KEY_PASSWORD
EOF

echo ""
echo "✅ keystore.properties dosyası oluşturuldu!"
echo ""
echo "📋 İçerik:"
echo "   storeFile=app/upload-key.keystore"
echo "   keyAlias=upload"
echo ""
echo "⚠️  GÜVENLİK: Bu dosya .gitignore'da, commit edilmeyecek"




