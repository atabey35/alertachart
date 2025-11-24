#!/bin/bash

# iOS Release Build Script
# Bu script iOS uygulamasını App Store için hazırlar

set -e

echo "🍎 iOS Release Build"
echo "===================="
echo ""

# iOS dizinine git
cd "$(dirname "$0")/../ios/App"

# Xcode workspace kontrolü
if [ ! -f "App.xcworkspace/contents.xcworkspacedata" ]; then
    echo "❌ App.xcworkspace bulunamadı!"
    echo "Önce pod install yapın:"
    echo "  cd ios/App && pod install"
    exit 1
fi

echo "📱 Proje Bilgileri:"
echo "   Bundle ID: com.kriptokirmizi.alerta"
echo "   Version: 1.1"
echo "   Build: 111"
echo ""

echo "📋 Sonraki Adımlar:"
echo ""
echo "1. Xcode'da projeyi açın:"
echo "   open App.xcworkspace"
echo ""
echo "2. Signing & Capabilities kontrolü:"
echo "   - Project navigator'da 'App' target'ını seçin"
echo "   - 'Signing & Capabilities' sekmesine gidin"
echo "   - Team: Apple Developer hesabınızı seçin"
echo "   - 'Automatically manage signing' ✅ işaretli olmalı"
echo ""
echo "3. Archive oluşturun:"
echo "   - Product → Scheme → App seçin"
echo "   - Product → Destination → Any iOS Device"
echo "   - Product → Archive (⌘B ile build, sonra Archive)"
echo ""
echo "4. App Store Connect'e yükleyin:"
echo "   - Organizer penceresi açılır"
echo "   - 'Distribute App' butonuna tıklayın"
echo "   - 'App Store Connect' seçin → Next"
echo "   - 'Upload' seçin → Next"
echo "   - 'Automatically manage signing' seçin → Next"
echo "   - 'Upload' butonuna tıklayın"
echo ""
echo "5. App Store Connect'te kontrol edin:"
echo "   - TestFlight sekmesine gidin"
echo "   - Build 'Processing' durumunda olacak"
echo "   - Hazır olduğunda 'Ready to Submit' olacak"
echo ""

echo "⚠️  ÖNEMLİ:"
echo "- Archive işlemi Xcode'da yapılmalı (komut satırından değil)"
echo "- Apple Developer hesabınızın aktif olduğundan emin olun"
echo "- Signing certificate'lerin yüklü olduğundan emin olun"
echo ""

echo "🚀 Xcode'u açmak için:"
echo "   cd ios/App && open App.xcworkspace"








