#!/usr/bin/env node
/**
 * Missing Coin Logos Download Script - Optimized Version
 * 
 * Bu script eksik coin logolarını missing-icons.json dosyasından okuyup indirir
 * Kullanım: node scripts/download-missing-logos-fast.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LOGOS_DIR = path.join(__dirname, '../public/logos');
const MISSING_ICONS_FILE = path.join(__dirname, '../missing-icons.json');

// CoinGecko API base URL
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Symbol mapping (CoinGecko ID'leri)
const SYMBOL_MAPPING = {
  'fxs': 'frax-share',
  'floki': 'floki-inu',
  'xmr': 'monero',
  'bsv': 'bitcoin-sv',
  'kas': 'kaspa',
  'safe': 'safe-coin',
  'ponke': 'ponke',
  'grass': 'grass',
  'drift': 'drift-protocol',
  'hippo': 'hippo',
  'degen': 'degen-base',
  'ban': 'banano',
  'akt': 'akash-network',
  'moca': 'mocaverse',
  'sonic': 'sonic',
  'arc': 'arc',
  'vvv': 'vvv',
  'ip': 'internet-protocol',
  'br': 'br',
  'ath': 'ath',
  'prompt': 'prompt',
  'fhe': 'fhenix',
  'ept': 'ept',
  'aiot': 'aiot',
  'b2': 'b2',
  'agt': 'agility',
  'bdxn': 'bdxn',
  'puffer': 'puffer-finance',
  'skate': 'skate',
  'dmc': 'dmc',
  'h': 'h',
  'ol': 'ol',
  'icnt': 'icnt',
  'bulla': 'bulla',
  'idol': 'idol',
  'm': 'm',
  'cross': 'cross-chain-bridge',
  'ain': 'ain',
  'tac': 'tac',
  'ta': 'ta',
  'zora': 'zora',
  'tag': 'tag',
  'zrc': 'zrc',
  'esports': 'esports',
  'play': 'play',
  'all': 'all',
  'in': 'in',
  'carv': 'carv',
  'aio': 'aio',
  'xny': 'xny',
  'useless': 'useless',
  'dam': 'dam',
  'cudis': 'cudis',
  'btr': 'btr',
  'q': 'q',
  'aria': 'aria',
  'take': 'take',
  'ptb': 'ptb',
  'flock': 'flock',
  'ub': 'ub',
  'toshi': 'toshi',
  'stbl': 'stbl',
  'aia': 'aia',
  'bless': 'bless',
  'fluid': 'fluid',
  'coai': 'coai',
  'hana': 'hana',
  'ake': 'ake',
  'xan': 'xan',
  'vfy': 'vfy',
  'truth': 'truth',
  'evaa': 'evaa',
  'lyn': 'lyn',
  'kgen': 'kgen',
  'mon': 'mon',
  'clo': 'clo',
  'lab': 'lab',
  'rvv': 'rvv',
  'bluai': 'bluai',
  'apr': 'apr',
  'on': 'on',
  'common': 'common',
  'cc': 'cc',
  'uai': 'uai',
  'folks': 'folks',
  'jct': 'jct',
  'clanker': 'clanker',
  'beat': 'beat',
  'sent': 'sent',
  'bob': 'bob',
  'irys': 'irys',
  'dodox': 'dodo',
  'bttc': 'bittorrent',
  'luna2': 'luna',
  '1000shib': 'shib',
  '1000xec': 'xec',
  '1000lunc': 'lunc',
  '1000pepe': 'pepe',
  '1000floki': 'floki',
  '1000000mog': 'mog',
  '1000000bob': 'bob',
  'kite': 'kite',
  'at': 'at',
  'chillguy': 'chillguy',
  'fartcoin': 'fartcoin',
};

// CoinGecko coin list cache
let coinGeckoList = null;
let coinGeckoAvailable = false;

/**
 * HTTP GET request (basit versiyon)
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * CoinGecko coin list'ini cache'le (sadece bir kez)
 */
async function getCoinGeckoList() {
  if (coinGeckoList) {
    return coinGeckoList;
  }
  
  if (!coinGeckoAvailable) {
    return null;
  }
  
  try {
    const data = await httpGet(`${COINGECKO_API}/coins/list?include_platform=false`);
    coinGeckoList = JSON.parse(data);
    return coinGeckoList;
  } catch (err) {
    coinGeckoAvailable = false;
    return null;
  }
}

/**
 * CoinGecko'dan coin ID bul
 */
async function findCoinId(symbol) {
  if (!coinGeckoAvailable) {
    return null;
  }
  
  try {
    const coins = await getCoinGeckoList();
    if (!coins) return null;
    
    const lowerSymbol = symbol.toLowerCase();
    
    // Önce mapping'den bak
    if (SYMBOL_MAPPING[lowerSymbol]) {
      const mappedId = SYMBOL_MAPPING[lowerSymbol];
      const coin = coins.find(c => c.id === mappedId || c.symbol.toLowerCase() === mappedId.toLowerCase());
      if (coin) return coin.id;
    }
    
    // Exact match
    let coin = coins.find(c => c.symbol.toLowerCase() === lowerSymbol);
    if (coin) return coin.id;
    
    // Partial match
    coin = coins.find(c => c.id.includes(lowerSymbol) || c.symbol.toLowerCase().includes(lowerSymbol));
    if (coin) return coin.id;
    
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * CoinGecko'dan coin detail al (image URL için)
 */
async function getCoinDetail(coinId) {
  if (!coinGeckoAvailable) {
    return null;
  }
  
  try {
    const data = await httpGet(`${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`);
    const coin = JSON.parse(data);
    return coin.image?.large || coin.image?.small || null;
  } catch (err) {
    return null;
  }
}

/**
 * Dosya indir
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(dest);
          if (stats.size < 100) {
            fs.unlinkSync(dest);
            reject(new Error('File too small'));
            return;
          }
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Base asset'i normalize et
 */
function normalizeBaseAsset(baseAsset) {
  const lower = baseAsset.toLowerCase();
  
  const skipCases = [
    'eur', 'broccoli714', 'broccolif3b', '币安人生',
    'btcusdt_251226', 'ethusdt_251226', 'btcusdt_260327', 'ethusdt_260327',
    'btcdom',
  ];
  
  if (skipCases.includes(lower)) {
    return null;
  }
  
  if (SYMBOL_MAPPING[lower]) {
    return SYMBOL_MAPPING[lower];
  }
  
  return lower;
}

/**
 * Logo indir - CoinGecko (sadece coinGeckoAvailable ise)
 */
async function downloadFromCoinGecko(baseAsset, symbol) {
  if (!coinGeckoAvailable) {
    return false;
  }
  
  const normalized = normalizeBaseAsset(baseAsset);
  if (!normalized) return false;
  
  try {
    const coinId = await findCoinId(normalized);
    if (!coinId) return false;
    
    const imageUrl = await getCoinDetail(coinId);
    if (!imageUrl) return false;
    
    const ext = imageUrl.split('.').pop().split('?')[0] || 'png';
    const dest = path.join(LOGOS_DIR, `${baseAsset.toLowerCase()}.${ext}`);
    
    if (fs.existsSync(dest)) {
      return 'exists';
    }
    
    await downloadFile(imageUrl, dest);
    console.log(`✅ ${symbol} (${baseAsset}) -> ${baseAsset.toLowerCase()}.${ext} (CoinGecko)`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Logo indir - Alternatif kaynaklar
 */
async function downloadFromAlternatives(baseAsset, symbol) {
  const normalized = normalizeBaseAsset(baseAsset);
  if (!normalized) return false;
  
  const extensions = ['png', 'jpg', 'jpeg', 'svg'];
  
  // CryptoIcons
  for (const ext of extensions) {
    const url = `https://cryptoicons.org/api/icon/${normalized}/${ext}`;
    const dest = path.join(LOGOS_DIR, `${baseAsset.toLowerCase()}.${ext}`);
    
    if (fs.existsSync(dest)) {
      return 'exists';
    }
    
    try {
      await downloadFile(url, dest);
      console.log(`✅ ${symbol} (${baseAsset}) -> ${baseAsset.toLowerCase()}.${ext} (CryptoIcons)`);
      return true;
    } catch (err) {
      // Devam et
    }
  }
  
  // Binance CDN
  for (const ext of extensions) {
    const url = `https://assets.binance.com/files/blockchains/ethereum/assets/${normalized}/logo.${ext}`;
    const dest = path.join(LOGOS_DIR, `${baseAsset.toLowerCase()}.${ext}`);
    
    if (fs.existsSync(dest)) {
      return 'exists';
    }
    
    try {
      await downloadFile(url, dest);
      console.log(`✅ ${symbol} (${baseAsset}) -> ${baseAsset.toLowerCase()}.${ext} (Binance CDN)`);
      return true;
    } catch (err) {
      // Devam et
    }
  }
  
  // TrustWallet Assets
  for (const ext of extensions) {
    const url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${normalized}/logo.${ext}`;
    const dest = path.join(LOGOS_DIR, `${baseAsset.toLowerCase()}.${ext}`);
    
    if (fs.existsSync(dest)) {
      return 'exists';
    }
    
    try {
      await downloadFile(url, dest);
      console.log(`✅ ${symbol} (${baseAsset}) -> ${baseAsset.toLowerCase()}.${ext} (TrustWallet)`);
      return true;
    } catch (err) {
      // Devam et
    }
  }
  
  return false;
}

/**
 * Logo indir
 */
async function downloadLogo(baseAsset, symbol) {
  const normalized = normalizeBaseAsset(baseAsset);
  
  if (!normalized) {
    return 'skipped';
  }
  
  // Önce mevcut dosyaları kontrol et
  const extensions = ['png', 'jpg', 'jpeg', 'svg'];
  for (const ext of extensions) {
    const dest = path.join(LOGOS_DIR, `${baseAsset.toLowerCase()}.${ext}`);
    if (fs.existsSync(dest)) {
      return 'exists';
    }
  }
  
  // Önce CoinGecko'dan dene (eğer available ise)
  if (coinGeckoAvailable) {
    const coinGeckoResult = await downloadFromCoinGecko(baseAsset, symbol);
    if (coinGeckoResult === true) return true;
    if (coinGeckoResult === 'exists') return 'exists';
  }
  
  // Alternatif kaynaklardan dene
  const altResult = await downloadFromAlternatives(baseAsset, symbol);
  if (altResult === true) return true;
  if (altResult === 'exists') return 'exists';
  
  return false;
}

/**
 * Ana fonksiyon
 */
async function main() {
  if (!fs.existsSync(MISSING_ICONS_FILE)) {
    console.error(`❌ missing-icons.json dosyası bulunamadı: ${MISSING_ICONS_FILE}`);
    process.exit(1);
  }
  
  const missingData = JSON.parse(fs.readFileSync(MISSING_ICONS_FILE, 'utf-8'));
  const missingIcons = missingData.missing;
  
  console.log(`📋 ${missingIcons.length} eksik logo bulundu`);
  console.log(`📊 Spot: ${missingData.spot}, Futures: ${missingData.futures}\n`);
  console.log('=== LOGO İNDİRME BAŞLIYOR ===\n');
  
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }
  
  // CoinGecko'yu test et (sadece bir kez)
  console.log('📡 CoinGecko API test ediliyor...');
  try {
    const testData = await httpGet(`${COINGECKO_API}/coins/list?include_platform=false`);
    coinGeckoList = JSON.parse(testData);
    coinGeckoAvailable = true;
    console.log(`✅ CoinGecko kullanılabilir (${coinGeckoList.length} coin)\n`);
  } catch (err) {
    coinGeckoAvailable = false;
    console.log(`⚠️  CoinGecko kullanılamıyor (${err.message}), sadece alternatif kaynaklardan devam ediliyor...\n`);
  }
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let exists = 0;
  
  // Her icon için logo indir
  for (let i = 0; i < missingIcons.length; i++) {
    const item = missingIcons[i];
    const { symbol, baseAsset } = item;
    
    process.stdout.write(`[${i + 1}/${missingIcons.length}] ${symbol} (${baseAsset})... `);
    
    // Rate limiting (her 3 coin'de bir bekle)
    if (i > 0 && i % 3 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const result = await downloadLogo(baseAsset, symbol);
    if (result === true) {
      success++;
      process.stdout.write('\n');
    } else if (result === 'skipped') {
      skipped++;
      console.log('⚠️  Atlanıyor');
    } else if (result === 'exists') {
      exists++;
      console.log('📦 Zaten mevcut');
    } else {
      failed++;
      console.log('❌ Bulunamadı');
    }
    
    // Her coin'de kısa bekleme
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n=== SONUÇ ===`);
  console.log(`✅ Başarılı: ${success}`);
  console.log(`⏭️  Atlanan: ${skipped}`);
  console.log(`📦 Zaten mevcut: ${exists}`);
  console.log(`❌ Başarısız: ${failed}`);
  console.log(`📊 Toplam: ${missingIcons.length}`);
  console.log(`\n💡 Başarısız icon'lar için manuel olarak logo ekleyebilirsiniz.`);
  console.log(`📁 Logo dizini: ${LOGOS_DIR}`);
}

// Script'i çalıştır
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { downloadLogo, findCoinId, normalizeBaseAsset };
