#!/usr/bin/env node
/**
 * Missing Icons Checker Script
 * 
 * Spot ve Futures watchlistlerde icon'u olmayan pariteleri tespit eder
 * Kullanım: node scripts/check-missing-icons.js
 */

const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '../public/logos');

// Quote assets (Watchlist.tsx'den alındı)
const QUOTE_ASSETS = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];

/**
 * Symbol'den base asset'i çıkar (Watchlist.tsx mantığı)
 */
function extractBaseAsset(symbol) {
  const upperSymbol = symbol.toUpperCase();
  
  for (const quote of QUOTE_ASSETS) {
    if (upperSymbol.endsWith(quote)) {
      return upperSymbol.slice(0, -quote.length);
    }
  }
  
  // Eğer quote asset bulunamazsa, tüm symbol base asset olarak kabul edilir
  return upperSymbol;
}

/**
 * Icon dosyası var mı kontrol et
 */
function hasIcon(baseAsset) {
  const lowerBase = baseAsset.toLowerCase();
  const extensions = ['png', 'jpg', 'jpeg', 'svg'];
  
  for (const ext of extensions) {
    const iconPath = path.join(LOGOS_DIR, `${lowerBase}.${ext}`);
    if (fs.existsSync(iconPath)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Binance API'den tüm spot pariteleri çek
 */
async function fetchSpotSymbols() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    return data.symbols
      .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map(s => s.symbol.toLowerCase());
  } catch (error) {
    console.error('❌ Spot symbols fetch error:', error.message);
    return [];
  }
}

/**
 * Binance API'den tüm futures pariteleri çek
 */
async function fetchFuturesSymbols() {
  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    const data = await response.json();
    return data.symbols
      .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map(s => s.symbol.toLowerCase());
  } catch (error) {
    console.error('❌ Futures symbols fetch error:', error.message);
    return [];
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🔍 Spot ve Futures watchlistlerde icon kontrolü başlatılıyor...\n');
  
  // Default watchlist symbols (Watchlist.tsx'den)
  const defaultSymbols = ['btcusdt', 'ethusdt', 'ethbtc', 'solusdt', 'bnbusdt', 'xrpusdt', 'adausdt'];
  
  // Binance API'den tüm pariteleri çek
  console.log('📡 Binance API\'den pariteler çekiliyor...');
  const spotSymbols = await fetchSpotSymbols();
  const futuresSymbols = await fetchFuturesSymbols();
  
  console.log(`✅ Spot pariteler: ${spotSymbols.length}`);
  console.log(`✅ Futures pariteler: ${futuresSymbols.length}\n`);
  
  // Tüm pariteleri birleştir (unique)
  const allSymbols = [...new Set([...defaultSymbols, ...spotSymbols, ...futuresSymbols])];
  
  console.log(`📊 Toplam ${allSymbols.length} unique parite kontrol ediliyor...\n`);
  
  // Eksik icon'ları bul
  const missingIcons = [];
  const hasIcons = [];
  
  for (const symbol of allSymbols) {
    const baseAsset = extractBaseAsset(symbol);
    const iconExists = hasIcon(baseAsset);
    
    if (iconExists) {
      hasIcons.push({ symbol, baseAsset });
    } else {
      missingIcons.push({ symbol, baseAsset });
    }
  }
  
  // Sonuçları göster
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 SONUÇLAR');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Icon'u olan pariteler: ${hasIcons.length}`);
  console.log(`❌ Icon'u olmayan pariteler: ${missingIcons.length}\n`);
  
  if (missingIcons.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ ICON\'U OLMAYAN PARİTELER');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Spot ve Futures'a göre ayır
    const spotMissing = missingIcons.filter(m => spotSymbols.includes(m.symbol));
    const futuresMissing = missingIcons.filter(m => futuresSymbols.includes(m.symbol));
    const defaultMissing = missingIcons.filter(m => defaultSymbols.includes(m.symbol));
    
    if (defaultMissing.length > 0) {
      console.log('📌 DEFAULT WATCHLIST:');
      defaultMissing.forEach(m => {
        console.log(`   ❌ ${m.symbol.padEnd(15)} → baseAsset: ${m.baseAsset.padEnd(10)} → icon: /logos/${m.baseAsset.toLowerCase()}.png`);
      });
      console.log('');
    }
    
    if (spotMissing.length > 0) {
      console.log(`📊 SPOT PARİTELER (${spotMissing.length} adet):`);
      spotMissing.slice(0, 50).forEach(m => {
        console.log(`   ❌ ${m.symbol.padEnd(15)} → baseAsset: ${m.baseAsset.padEnd(10)} → icon: /logos/${m.baseAsset.toLowerCase()}.png`);
      });
      if (spotMissing.length > 50) {
        console.log(`   ... ve ${spotMissing.length - 50} adet daha`);
      }
      console.log('');
    }
    
    if (futuresMissing.length > 0) {
      console.log(`📈 FUTURES PARİTELER (${futuresMissing.length} adet):`);
      futuresMissing.slice(0, 50).forEach(m => {
        console.log(`   ❌ ${m.symbol.padEnd(15)} → baseAsset: ${m.baseAsset.padEnd(10)} → icon: /logos/${m.baseAsset.toLowerCase()}.png`);
      });
      if (futuresMissing.length > 50) {
        console.log(`   ... ve ${futuresMissing.length - 50} adet daha`);
      }
      console.log('');
    }
    
    // JSON dosyasına kaydet
    const outputFile = path.join(__dirname, '../missing-icons.json');
    const output = {
      total: missingIcons.length,
      spot: spotMissing.length,
      futures: futuresMissing.length,
      default: defaultMissing.length,
      missing: missingIcons.map(m => ({
        symbol: m.symbol,
        baseAsset: m.baseAsset,
        iconPath: `/logos/${m.baseAsset.toLowerCase()}.png`
      }))
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`💾 Sonuçlar ${outputFile} dosyasına kaydedildi.\n`);
  } else {
    console.log('🎉 Tüm paritelerin icon\'u mevcut!\n');
  }
  
  // İstatistikler
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 İSTATİSTİKLER');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Toplam Parite: ${allSymbols.length}`);
  console.log(`Icon'u Olan: ${hasIcons.length} (${((hasIcons.length / allSymbols.length) * 100).toFixed(1)}%)`);
  console.log(`Icon'u Olmayan: ${missingIcons.length} (${((missingIcons.length / allSymbols.length) * 100).toFixed(1)}%)\n`);
}

// Script'i çalıştır
main().catch(console.error);

