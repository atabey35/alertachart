#!/bin/bash
# Fiziksel Android cihazdan logları almak için script

echo "📱 Fiziksel Android cihazınızı USB ile bağlayın"
echo "📱 USB debugging'i açın (Ayarlar > Geliştirici Seçenekleri > USB Debugging)"
echo ""
echo "⏳ Cihazlar kontrol ediliyor..."
sleep 2

# Tüm cihazları listele
DEVICES=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "❌ Cihaz bulunamadı!"
    echo ""
    echo "💡 Kontrol edin:"
    echo "   1. USB debugging açık mı?"
    echo "   2. USB kablosu bağlı mı?"
    echo "   3. 'Bu bilgisayara güven' onayı verdiniz mi?"
    exit 1
fi

echo "✅ Bulunan cihazlar:"
echo "$DEVICES" | while read device; do
    echo "   - $device"
done

echo ""
echo "📋 Alerta uygulama logları filtreleniyor..."
echo "   (Ctrl+C ile durdurun)"
echo "   (Fiziksel cihazda uygulamayı açın ve kullanın)"
echo ""

# React Native / Expo loglarını filtrele
adb logcat -c  # Önceki logları temizle
adb logcat | grep -E "(ReactNativeJS|ExpoModules|expo-notifications|Alerta|Device ID|Push token|registerPushToken|Failed to register|registered with backend)"










