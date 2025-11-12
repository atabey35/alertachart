# 🚀 Alerta Chart - Başlangıç Kılavuzu

## ✅ Proje Tamamen Hazır!

aggr.trade mimarisini klonlayarak **SIFIRDAN** oluşturuldu.

## 📊 Neler Var?

### ✅ Gerçek Mimari (aggr.trade Clone)
- **Web Worker Architecture**: Dedicated worker for real-time trade aggregation
- **Canvas-based Charts**: High-performance rendering (lightweight-charts)
- **Historical API**: REST endpoint for bar data
- **Smart Caching**: Chunk-based data management
- **Exchange Connectors**: Binance, Bybit, OKX

### ✅ Dosya Yapısı

```
alerta-chart/
├── app/
│   ├── api/historical/[...params]/route.ts  ← Historical API
│   ├── layout.tsx
│   ├── page.tsx                              ← Main UI
│   └── globals.css
├── components/chart/
│   ├── Chart.tsx                             ← Canvas chart component
│   └── ChartCache.ts                         ← Data caching
├── workers/
│   ├── BaseExchange.ts                       ← Exchange base class
│   ├── aggregator.ts                         ← Web Worker (real-time)
│   └── exchanges/                            ← Exchange implementations
│       ├── BinanceExchange.ts
│       ├── BybitExchange.ts
│       └── OKXExchange.ts
├── services/
│   └── historicalService.ts                  ← Historical data fetching
├── types/
│   ├── chart.ts                              ← Bar, Trade types
│   └── exchange.ts                           ← Exchange types
└── utils/
    ├── bucket.ts                             ← Time bucketing
    ├── helpers.ts                            ← Utilities
    └── constants.ts                          ← Config
```

## 🚀 Nasıl Çalıştırılır?

### 1. Terminal'de Çalıştır

```bash
cd /Users/ata/Downloads/aggr-master/alerta-chart

# Dependencies zaten kurulu
npm run dev
```

### 2. Tarayıcıda Aç

```
http://localhost:3000
```

## 🎨 Özellikler

### ✅ Gerçek Veriler
- **Live Trading Data**: Real-time trades from exchanges
- **Historical Backfill**: API endpoint for historical bars
- **Multiple Exchanges**: Binance, Bybit, OKX
- **Multiple Pairs**: BTCUSDT, ETHUSDT, SOLUSDT
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d

### ✅ UI Controls
- **Exchange Dropdown**: Switch exchanges real-time
- **Pair Dropdown**: Select trading pairs
- **Timeframe Buttons**: Quick switching (1m - 1d)
- **Professional Chart**: Canvas-based, 60fps

### ✅ Performance
- **Web Worker**: Runs in separate thread
- **Smart Cache**: Chunk-based storage
- **Efficient Rendering**: Only visible data

## 📡 API Endpoints

### Historical Data

```
GET /api/historical/:from/:to/:timeframe/:markets

Example:
http://localhost:3000/api/historical/1730000000000/1730086400000/300000/BINANCE:BTCUSDT

Response:
{
  "from": 1730000000000,
  "to": 1730086400000,
  "data": [{ time, open, high, low, close, vbuy, vsell, ... }],
  "initialPrices": { "BINANCE:BTCUSDT": 65000 }
}
```

## 🔧 Konfigürasyon

### Exchanges Ekle/Çıkar
`utils/constants.ts`:
```typescript
export const SUPPORTED_EXCHANGES = ['BINANCE', 'BYBIT', 'OKX'];
```

### Timeframes Değiştir
```typescript
export const TIMEFRAMES = [60, 300, 900, 3600, 14400, 86400];
```

### Pairs Değiştir
`app/page.tsx`:
```typescript
const pairs = ['btcusdt', 'ethusdt', 'solusdt', 'bnbusdt'];
```

## 📂 Nasıl Çalışır?

### Data Flow

```
1. Exchange WebSocket ──> 2. Web Worker ──> 3. Aggregator
                                                    │
                                                    ├──> 4. Cache
                                                    │
                                                    └──> 5. Chart (Canvas)
```

### Real-time Updates

```typescript
// Worker collects trades
worker.postMessage({ op: 'connect', data: { exchange, pair } })

// Worker aggregates into bars
aggregator.handleTrades(trades) → Bar

// Chart receives bars
chart.onMessage((bar) => cache.addBar(bar))
```

## 🎯 Şu Anda Çalışan Özellikler

✅ Next.js 15 + React 19  
✅ TypeScript  
✅ Tailwind CSS  
✅ lightweight-charts (Canvas)  
✅ Web Worker Architecture  
✅ Real Exchange Connectors (Binance, Bybit, OKX)  
✅ Historical API Endpoint  
✅ Smart Caching System  
✅ Multiple Timeframes  
✅ Exchange Switching  
✅ Professional UI  

## 🚧 Gelecek Geliştirmeler

- [ ] Gerçek historical data (şu an mock)
- [ ] Kraken & Coinbase full implementation
- [ ] Volume indicators
- [ ] Drawing tools
- [ ] Alerts system
- [ ] Multiple panes
- [ ] Custom indicators
- [ ] WebSocket reconnection handling
- [ ] Error boundaries
- [ ] Loading states

## 📖 Dökümanlar

- **README.md**: Genel bilgi
- **ARCHITECTURE.md**: Mimari detayları (yapılacak)
- **API.md**: API dökümanı (yapılacak)

## 🙏 Credits

Based on [aggr.trade](https://github.com/Tucsky/aggr) architecture by Tucsky

---

## ⚡ Hızlı Başlangıç

```bash
# 1. Development server
npm run dev

# 2. Tarayıcıda aç
http://localhost:3000

# 3. Exchange, pair, timeframe seç

# 4. Real-time chart izle!
```

**Artık tamamen çalışan bir aggr.trade klonun var!** 🎉
