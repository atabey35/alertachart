# Alerta Chart

Professional real-time cryptocurrency charting platform - Clone of aggr.trade architecture using modern Next.js.

## 🚀 Features

- ✅ **Real-time Data**: Live trades from Binance, Bybit, OKX, Kraken, Coinbase
- ✅ **Canvas-based Charts**: High-performance rendering with lightweight-charts
- ✅ **Web Worker Architecture**: Dedicated worker for data aggregation (aggr.trade style)
- ✅ **Historical Data**: API endpoint for historical bar data
- ✅ **Smart Caching**: Efficient chunk-based data management
- ✅ **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d
- ✅ **Exchange Switching**: Switch between exchanges in real-time
- ✅ **Professional UI**: Clean, modern interface

## 📁 Project Structure

```
alerta-chart/
├── app/                          # Next.js App Router
│   ├── api/historical/          # Historical data API endpoint
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main app page
│   └── globals.css              # Global styles
├── components/
│   └── chart/
│       ├── Chart.tsx            # Main chart component
│       └── ChartCache.ts        # Data caching system
├── workers/
│   ├── BaseExchange.ts          # Base exchange class
│   ├── aggregator.ts            # Web Worker for real-time aggregation
│   └── exchanges/               # Exchange implementations
│       ├── BinanceExchange.ts
│       ├── BybitExchange.ts
│       └── OKXExchange.ts
├── services/
│   └── historicalService.ts     # Historical data fetching
├── types/
│   ├── chart.ts                 # Chart types (Bar, Trade, etc.)
│   └── exchange.ts              # Exchange types
└── utils/
    ├── constants.ts             # App constants
    ├── helpers.ts               # Utility functions
    └── bucket.ts                # Time bucketing utilities
```

## 🛠️ Installation

```bash
cd /Users/ata/Downloads/aggr-master/alerta-chart
npm install
```

## 🚀 Development

```bash
# Run development server
npm run dev

# Build worker
npm run worker:build

# Run both (recommended)
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Data Flow

```
Exchange WebSocket → Web Worker → Aggregator → Cache → Chart
                                      ↓
                              Historical API
```

### Key Components

1. **Web Worker (`aggregator.ts`)**: 
   - Connects to exchange WebSockets
   - Aggregates trades into bars
   - Runs in separate thread for performance

2. **Chart Cache (`ChartCache.ts`)**:
   - Manages historical data in chunks
   - Efficient memory usage
   - Fast lookups

3. **Historical API (`/api/historical`)**:
   - REST endpoint for historical bars
   - Format: `/api/historical/{from}/{to}/{timeframe}/{markets}`
   - Aggregates data from multiple exchanges

4. **Exchange Connectors**:
   - Binance, Bybit, OKX support
   - Unified interface
   - Real-time trade streams

## 📊 API Usage

### Historical Data

```typescript
GET /api/historical/:from/:to/:timeframe/:markets

// Example
GET /api/historical/1730000000000/1730086400000/300000/BINANCE:BTCUSDT

Response:
{
  "from": 1730000000000,
  "to": 1730086400000,
  "data": [
    {
      "time": 1730000000000,
      "open": 65000,
      "high": 65500,
      "low": 64800,
      "close": 65200,
      "vbuy": 150.5,
      "vsell": 120.3,
      ...
    }
  ],
  "initialPrices": {
    "BINANCE:BTCUSDT": 65000
  }
}
```

## 🎨 UI Features

- **Exchange Selector**: Switch between Binance, Bybit, OKX
- **Pair Selector**: Choose trading pairs (BTCUSDT, ETHUSDT, etc.)
- **Timeframe Buttons**: Quick timeframe switching (1m - 1d)
- **Real-time Updates**: Live candle formation
- **Smooth Performance**: 60fps rendering

## 🔧 Configuration

Edit `utils/constants.ts` to customize:

```typescript
// Timeframes
export const TIMEFRAMES = [60, 300, 900, 3600, 14400, 86400];

// Exchanges
export const SUPPORTED_EXCHANGES = ['BINANCE', 'BYBIT', 'OKX'];

// Cache
export const MAX_BARS_PER_CHUNKS = 10000;
export const CHUNK_DURATION = 86400000; // 24h
```

## 📝 Based on aggr.trade

This project clones the core architecture of [aggr.trade](https://github.com/Tucsky/aggr):

- Web Worker-based aggregation
- Chunk-based data caching
- Exchange abstraction layer
- Historical API structure
- Time bucketing logic

## 🚧 TODO

- [ ] Add more exchanges (Kraken, Coinbase full implementation)
- [ ] Implement real historical data fetching from exchange APIs
- [ ] Add volume indicators
- [ ] Add drawing tools
- [ ] Add alerts system
- [ ] Add multiple panes support
- [ ] Add custom indicators

## 📄 License

MIT

## 🙏 Credits

Inspired by [aggr.trade](https://aggr.trade) by Tucsky


## 🔗 Links

- **Frontend Repository**: https://github.com/atabey35/alertachart
- **Backend Repository**: (Coming soon)
- **Live Demo**: (Deploy to Vercel first)

---

**Built with ❤️ by Atabey**
