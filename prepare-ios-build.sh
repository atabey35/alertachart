#!/bin/bash

# iOS Build Hazırlık Scripti
# Xcode kurulduktan SONRA çalıştırın

set -e

echo "═══════════════════════════════════════════════════════"
echo "  iOS BUILD HAZIRLIĞI"
echo "═══════════════════════════════════════════════════════"
echo ""

# Xcode kontrolü
if [ ! -d "/Applications/Xcode.app" ]; then
    echo "❌ Xcode bulunamadı!"
    echo "📦 Lütfen önce App Store'dan Xcode'u yükleyin."
    echo "   App Store → 'Xcode' ara → Install"
    exit 1
fi

echo "✅ Xcode bulundu"
echo ""

# Xcode'u aktif et
echo "🔧 Xcode'u aktif developer directory olarak ayarlanıyor..."
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Xcode lisansını kontrol et
echo "📜 Xcode lisansı kontrol ediliyor..."
if ! sudo xcodebuild -license check 2>/dev/null; then
    echo "⚠️  Xcode lisansı kabul edilmemiş."
    echo "   Lütfen Xcode'u açın ve lisansı kabul edin."
    echo "   Veya terminal'de: sudo xcodebuild -license accept"
    read -p "Lisansı kabul ettiniz mi? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Xcode hazır"
echo ""

# Proje dizinine git
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Capacitor sync yapılıyor..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync başarısız!"
    exit 1
fi

echo "✅ Capacitor sync tamamlandı"
echo ""

# CocoaPods kontrolü
if ! command -v pod &> /dev/null; then
    echo "📦 CocoaPods yükleniyor..."
    sudo gem install cocoapods
fi

echo "📦 CocoaPods dependencies yükleniyor..."
cd ios/App
pod install

if [ $? -ne 0 ]; then
    echo "❌ Pod install başarısız!"
    exit 1
fi

echo "✅ Pod install tamamlandı"
echo ""

# Proje root'una geri dön
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  ✅ HAZIRLIK TAMAMLANDI!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🚀 Şimdi Xcode'u açabilirsiniz:"
echo ""
echo "   open ios/App/App.xcworkspace"
echo ""
echo "📖 Detaylı rehber için: XCODE_BUILD_ADIM_ADIM.md"
echo ""

# Xcode'u açmak ister misiniz?
read -p "Xcode'u şimdi açmak ister misiniz? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open ios/App/App.xcworkspace
    echo "✅ Xcode açılıyor..."
fi

