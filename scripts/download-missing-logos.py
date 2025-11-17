#!/usr/bin/env python3
"""
Missing Coin Logos Download Script

Bu script eksik coin logolarını çeşitli kaynaklardan indirir.
Kullanım: python3 scripts/download-missing-logos.py
"""

import os
import sys
import requests
import time
from pathlib import Path

# Dizinler
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
LOGOS_DIR = PROJECT_ROOT / 'public' / 'logos'
MISSING_FILE = Path('/tmp/still_missing_logos.txt')

# API endpoints
COINGECKO_API = 'https://api.coingecko.com/api/v3'
COINGECKO_IMAGE = 'https://assets.coingecko.com/coins/images'

# Rate limiting
REQUEST_DELAY = 0.5  # saniye


def download_file(url, dest_path):
    """Dosya indir"""
    try:
        response = requests.get(url, timeout=10, stream=True)
        if response.status_code == 200:
            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        return False
    except Exception as e:
        return False


def find_coin_id(symbol):
    """CoinGecko'dan coin ID bul"""
    try:
        url = f"{COINGECKO_API}/coins/list"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            coins = response.json()
            for coin in coins:
                if coin['symbol'].lower() == symbol.lower():
                    return coin['id']
    except Exception as e:
        pass
    return None


def download_logo(coin_symbol):
    """Logo indir"""
    symbol = coin_symbol.lower()
    extensions = ['png', 'jpg', 'jpeg', 'svg']
    
    # Önce CoinGecko'dan dene
    coin_id = find_coin_id(symbol)
    if coin_id:
        for ext in extensions:
            url = f"{COINGECKO_IMAGE}/{coin_id}/large.{ext}"
            dest = LOGOS_DIR / f"{symbol}.{ext}"
            
            if download_file(url, dest):
                print(f"✅ {coin_symbol} -> {symbol}.{ext} (CoinGecko)")
                return True
    
    # Alternatif: CryptoIcons
    for ext in extensions:
        url = f"https://cryptoicons.org/api/icon/{symbol}/{ext}"
        dest = LOGOS_DIR / f"{symbol}.{ext}"
        
        if download_file(url, dest):
            print(f"✅ {coin_symbol} -> {symbol}.{ext} (CryptoIcons)")
            return True
    
    print(f"❌ {coin_symbol} -> Logo bulunamadı")
    return False


def main():
    """Ana fonksiyon"""
    # Eksik coin listesini oku
    if not MISSING_FILE.exists():
        print(f"❌ Eksik logo listesi bulunamadı: {MISSING_FILE}")
        print("   Önce eksik logoları tespit edin:")
        print("   python3 scripts/detect-missing-logos.py")
        sys.exit(1)
    
    with open(MISSING_FILE, 'r') as f:
        missing_coins = [line.strip() for line in f if line.strip()]
    
    print(f"📋 {len(missing_coins)} eksik logo bulundu\n")
    print("=== LOGO İNDİRME BAŞLIYOR ===\n")
    
    success = 0
    failed = 0
    
    for i, coin in enumerate(missing_coins, 1):
        print(f"[{i}/{len(missing_coins)}] {coin}...", end=' ')
        
        if download_logo(coin):
            success += 1
        else:
            failed += 1
        
        # Rate limiting
        if i < len(missing_coins):
            time.sleep(REQUEST_DELAY)
        
        # Her 10 coin'de bir durum raporu
        if i % 10 == 0:
            print(f"\n📊 İlerleme: {i}/{len(missing_coins)} | ✅ {success} | ❌ {failed}\n")
    
    print(f"\n=== SONUÇ ===")
    print(f"✅ Başarılı: {success}")
    print(f"❌ Başarısız: {failed}")
    print(f"📊 Toplam: {len(missing_coins)}")


if __name__ == '__main__':
    main()

