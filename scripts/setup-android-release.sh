#!/bin/bash

# Android Release Setup Script
# Bu script signing key oluşturur ve keystore.properties dosyasını hazırlar

set -e

echo "🔐 Android Release Setup"
echo "========================"
echo ""

# Android dizinine git
cd "$(dirname "$0")/../android"

# Keystore dosyası var mı kontrol et
if [ -f "app/alerta-release.keystore" ]; then
    echo "⚠️  Keystore dosyası zaten mevcut: app/alerta-release.keystore"
    read -p "Yeni keystore oluşturmak istiyor musunuz? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Mevcut keystore kullanılacak"
        exit 0
    fi
fi

# Keystore oluştur
echo "📝 Keystore oluşturuluyor..."
echo ""
echo "⚠️  ÖNEMLİ: Bu bilgileri GÜVENLİ bir yerde saklayın!"
echo ""

keytool -genkey -v -keystore app/alerta-release.keystore \
    -alias alerta \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore başarıyla oluşturuldu: app/alerta-release.keystore"
else
    echo "❌ Keystore oluşturma başarısız!"
    exit 1
fi

# Keystore properties dosyası oluştur
echo ""
echo "📝 keystore.properties dosyası oluşturuluyor..."
echo ""

read -sp "Keystore password: " STORE_PASSWORD
echo
read -sp "Key password (genellikle aynı): " KEY_PASSWORD
echo

# Eğer key password boşsa, store password kullan
if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD=$STORE_PASSWORD
fi

cat > keystore.properties << EOF
storeFile=app/alerta-release.keystore
storePassword=$STORE_PASSWORD
keyAlias=alerta
keyPassword=$KEY_PASSWORD
EOF

echo ""
echo "✅ keystore.properties dosyası oluşturuldu"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. Release build oluştur: ./gradlew bundleRelease"
echo "2. AAB dosyası: app/build/outputs/bundle/release/app-release.aab"
echo "3. Google Play Console'a yükle"
echo ""
echo "⚠️  GÜVENLİK:"
echo "- keystore.properties dosyasını .gitignore'a ekleyin"
echo "- Keystore dosyasını GÜVENLİ bir yerde saklayın"
echo "- Şifreleri unutmayın!"



