#!/usr/bin/env python3
"""
Missing Logos Detection Script

Eksik coin logolarını tespit eder ve liste oluşturur.
Kullanım: python3 scripts/detect-missing-logos.py
"""

import os
import sys
from pathlib import Path
import subprocess

# Dizinler
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
LOGOS_DIR = PROJECT_ROOT / 'public' / 'logos'
OUTPUT_FILE = Path('/tmp/still_missing_logos.txt')


def get_futures_coins():
    """Binance Futures API'den coin listesini al"""
    try:
        import requests
        url = 'https://fapi.binance.com/fapi/v1/exchangeInfo'
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            coins = set()
            for symbol in data.get('symbols', []):
                if symbol.get('status') == 'TRADING' and symbol.get('contractType') == 'PERPETUAL':
                    coins.add(symbol.get('baseAsset', '').lower())
            return coins
    except Exception as e:
        print(f"⚠️  API'den coin listesi alınamadı: {e}")
        return None


def get_existing_logos():
    """Mevcut logoları al"""
    existing = set()
    if LOGOS_DIR.exists():
        for file in LOGOS_DIR.iterdir():
            if file.is_file() and file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.svg']:
                name_no_ext = file.stem.lower()
                existing.add(name_no_ext)
    return existing


def main():
    """Ana fonksiyon"""
    print("=== EKSİK LOGOLAR TESPİT EDİLİYOR ===\n")
    
    # Futures coin listesini al
    print("📡 Binance Futures API'den coin listesi alınıyor...")
    futures_coins = get_futures_coins()
    
    if not futures_coins:
        # Fallback: curl kullan
        print("⚠️  Python requests yok, curl kullanılıyor...")
        try:
            result = subprocess.run(
                ['curl', '-s', 'https://fapi.binance.com/fapi/v1/exchangeInfo'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                import json
                data = json.loads(result.stdout)
                futures_coins = set()
                for symbol in data.get('symbols', []):
                    if symbol.get('status') == 'TRADING' and symbol.get('contractType') == 'PERPETUAL':
                        futures_coins.add(symbol.get('baseAsset', '').lower())
        except Exception as e:
            print(f"❌ Coin listesi alınamadı: {e}")
            sys.exit(1)
    
    print(f"✅ {len(futures_coins)} futures coin bulundu\n")
    
    # Mevcut logoları al
    print("📁 Mevcut logolar kontrol ediliyor...")
    existing_logos = get_existing_logos()
    print(f"✅ {len(existing_logos)} mevcut logo bulundu\n")
    
    # Eksik logoları bul
    missing = sorted(futures_coins - existing_logos)
    
    print(f"=== SONUÇ ===")
    print(f"Toplam futures coin: {len(futures_coins)}")
    print(f"Mevcut logo: {len(existing_logos)}")
    print(f"Eksik logo: {len(missing)}\n")
    
    # Dosyaya kaydet
    with open(OUTPUT_FILE, 'w') as f:
        for coin in missing:
            f.write(f"{coin}\n")
    
    print(f"✅ Eksik liste kaydedildi: {OUTPUT_FILE}\n")
    
    # İlk 50'yi göster
    print("Eksik logolar (ilk 50):")
    for coin in missing[:50]:
        print(f"  - {coin}")
    
    if len(missing) > 50:
        print(f"\n... ve {len(missing) - 50} tane daha")
    
    print(f"\n💡 Logo indirmek için:")
    print(f"   python3 scripts/download-missing-logos.py")


if __name__ == '__main__':
    main()

