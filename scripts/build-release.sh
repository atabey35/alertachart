#!/bin/bash

# Android Release Build Script
# Bu script release AAB dosyası oluşturur

set -e

echo "🏗️  Android Release Build"
echo "========================"
echo ""

# Root dizinine git
cd "$(dirname "$0")/.."

# Android dizinine git
cd android

# Keystore kontrolü
if [ ! -f "keystore.properties" ]; then
    echo "❌ keystore.properties dosyası bulunamadı!"
    echo ""
    echo "Önce signing key oluşturun:"
    echo "  ./scripts/setup-android-release.sh"
    echo ""
    exit 1
fi

# Version kontrolü
VERSION_CODE=$(grep "versionCode" app/build.gradle | head -1 | sed 's/.*versionCode //' | sed 's/ *$//')
VERSION_NAME=$(grep "versionName" app/build.gradle | head -1 | sed 's/.*versionName "//' | sed 's/".*//')

echo "📱 Version: $VERSION_NAME ($VERSION_CODE)"
echo ""

# Build
echo "🔨 Release AAB oluşturuluyor..."
echo ""

./gradlew clean bundleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build başarılı!"
    echo ""
    echo "📦 AAB dosyası:"
    echo "   app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "📤 Sonraki adımlar:"
    echo "1. Google Play Console'a giriş yapın"
    echo "2. Production → Releases → Create new release"
    echo "3. AAB dosyasını yükleyin"
    echo "4. Release notes ekleyin"
    echo "5. Review release → Start rollout to Production"
    echo ""
else
    echo ""
    echo "❌ Build başarısız!"
    exit 1
fi








