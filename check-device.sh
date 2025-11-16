#!/bin/bash
# Android cihazı kontrol et ve logları başlat

echo "📱 Android cihaz kontrol ediliyor..."
echo ""

# Cihazları listele
DEVICES=$(adb devices | grep -v "List" | grep "device$")

if [ -z "$DEVICES" ]; then
    echo "❌ Fiziksel cihaz bulunamadı!"
    echo ""
    echo "💡 Kontrol edin:"
    echo "   1. USB kablosu bağlı mı?"
    echo "   2. USB debugging açık mı? (Ayarlar > Geliştirici Seçenekleri)"
    echo "   3. Telefonda 'Bu bilgisayara güven' onayı verdiniz mi?"
    echo ""
    echo "📋 Tüm cihazlar:"
    adb devices
    exit 1
fi

echo "✅ Cihaz bulundu!"
echo ""
echo "$DEVICES"
echo ""
echo "🚀 Logları başlatıyorum..."
echo "   (Fiziksel cihazda uygulamayı açın)"
echo "   (Ctrl+C ile durdurun)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Önceki logları temizle
adb logcat -c

# Logları filtrele ve göster
adb logcat | grep -E "(ReactNativeJS|Device ID|Push token|registerPushToken|Failed|registered|expo-notifications|Alerta)" --line-buffered











