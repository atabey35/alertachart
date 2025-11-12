#!/bin/bash
# Android cihazdan logları almak için script

echo "📱 Android cihazınızı USB ile bağlayın ve USB debugging'i açın"
echo "⏳ Cihaz bekleniyor..."
sleep 2

# Cihazı kontrol et
DEVICE=$(adb devices | grep -v "List" | awk '{print $1}' | head -1)

if [ -z "$DEVICE" ]; then
    echo "❌ Cihaz bulunamadı! USB debugging açık mı kontrol edin."
    exit 1
fi

echo "✅ Cihaz bulundu: $DEVICE"
echo ""
echo "📋 Alerta uygulama logları filtreleniyor..."
echo "   (Ctrl+C ile durdurun)"
echo ""

# React Native / Expo loglarını filtrele
adb logcat | grep -E "(ReactNativeJS|ExpoModules|expo-notifications|Alerta|Device ID|Push token|registerPushToken)"










