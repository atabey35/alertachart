#!/usr/bin/env node
/**
 * Missing Coin Logos Download Script
 * 
 * Bu script eksik coin logolarını CoinGecko API'den indirir
 * Kullanım: node scripts/download-missing-logos.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LOGOS_DIR = path.join(__dirname, '../public/logos');
const MISSING_FILE = '/tmp/still_missing_logos.txt';

// CoinGecko API base URL
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINGECKO_IMAGE = 'https://assets.coingecko.com/coins/images';

// Alternatif kaynaklar
const ALTERNATIVE_SOURCES = [
  'https://cryptoicons.org/api/icon',
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains',
];

/**
 * Dosya indir
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Redirect
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

/**
 * CoinGecko'dan coin ID bul
 */
async function findCoinId(symbol) {
  return new Promise((resolve, reject) => {
    const url = `${COINGECKO_API}/coins/list?include_platform=false`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const coins = JSON.parse(data);
          const coin = coins.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
          resolve(coin ? coin.id : null);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Logo indir
 */
async function downloadLogo(coinSymbol) {
  const symbol = coinSymbol.toLowerCase();
  const extensions = ['png', 'jpg', 'jpeg', 'svg'];
  
  // Önce CoinGecko'dan dene
  try {
    const coinId = await findCoinId(symbol);
    if (coinId) {
      for (const ext of extensions) {
        const url = `${COINGECKO_IMAGE}/${coinId}/large.${ext}`;
        const dest = path.join(LOGOS_DIR, `${symbol}.${ext}`);
        
        try {
          await downloadFile(url, dest);
          console.log(`✅ ${coinSymbol} -> ${symbol}.${ext} (CoinGecko)`);
          return true;
        } catch (err) {
          // Devam et
        }
      }
    }
  } catch (err) {
    // CoinGecko başarısız, alternatif kaynakları dene
  }
  
  // Alternatif kaynaklar
  for (const baseUrl of ALTERNATIVE_SOURCES) {
    for (const ext of extensions) {
      let url;
      if (baseUrl.includes('cryptoicons')) {
        url = `${baseUrl}/${symbol}/${ext}`;
      } else {
        // Trust Wallet assets
        url = `${baseUrl}/ethereum/assets/${symbol}/logo.${ext}`;
      }
      
      const dest = path.join(LOGOS_DIR, `${symbol}.${ext}`);
      
      try {
        await downloadFile(url, dest);
        console.log(`✅ ${coinSymbol} -> ${symbol}.${ext} (${baseUrl})`);
        return true;
      } catch (err) {
        // Devam et
      }
    }
  }
  
  console.log(`❌ ${coinSymbol} -> Logo bulunamadı`);
  return false;
}

/**
 * Ana fonksiyon
 */
async function main() {
  // Eksik coin listesini oku
  if (!fs.existsSync(MISSING_FILE)) {
    console.error(`❌ Eksik logo listesi bulunamadı: ${MISSING_FILE}`);
    process.exit(1);
  }
  
  const missingCoins = fs.readFileSync(MISSING_FILE, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  console.log(`📋 ${missingCoins.length} eksik logo bulundu\n`);
  console.log('=== LOGO İNDİRME BAŞLIYOR ===\n');
  
  let success = 0;
  let failed = 0;
  
  // Her coin için logo indir
  for (let i = 0; i < missingCoins.length; i++) {
    const coin = missingCoins[i];
    console.log(`[${i + 1}/${missingCoins.length}] ${coin}...`);
    
    // Rate limiting için bekle
    if (i > 0 && i % 10 === 0) {
      console.log('⏳ Rate limiting için 2 saniye bekleniyor...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const result = await downloadLogo(coin);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Her 5 coin'de bir kısa bekleme
    if (i > 0 && i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n=== SONUÇ ===`);
  console.log(`✅ Başarılı: ${success}`);
  console.log(`❌ Başarısız: ${failed}`);
  console.log(`📊 Toplam: ${missingCoins.length}`);
}

// Script'i çalıştır
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadLogo, findCoinId };





