# 🏗️ Alerta Chart - Sistem Mimarisi Dokümantasyonu

## 📋 İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Backend Mimarisi (alertachart-backend)](#2-backend-mimarisi-alertachart-backend)
3. [Frontend Mimarisi (alertachart)](#3-frontend-mimarisi-alertachart)
4. [Database Mimarisi](#4-database-mimarisi)
5. [Servisler ve Bağımlılıklar](#5-servisler-ve-bağımlılıklar)
6. [Veri Akışı ve İletişim](#6-veri-akışı-ve-iletişim)
7. [Güvenlik ve Kimlik Doğrulama](#7-güvenlik-ve-kimlik-doğrulama)
8. [Push Notification Sistemi](#8-push-notification-sistemi)
9. [Mobil Uygulama Mimarisi](#9-mobil-uygulama-mimarisi)

---

## 1. Genel Bakış

### 1.1. Sistem Mimarisi Özeti

Alerta Chart, modern bir kripto para grafik platformudur. Sistem, mikroservis mimarisi kullanarak ayrılmış frontend ve backend bileşenlerinden oluşur.

```
┌─────────────────────────────────────────────────────────────┐
│                    ALERTA CHART ECOSYSTEM                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND           │         │   BACKEND            │
│   (alertachart)      │◄────────┤   (alertachart-      │
│   Next.js 15         │  Proxy  │   backend)           │
│   Vercel Pro         │         │   Express.js         │
│   www.alertachart.com│         │   Railway            │
└──────────────────────┘         └──────────────────────┘
         │                                 │
         │                                 │
         ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│   DATABASE           │         │   EXTERNAL APIs      │
│   PostgreSQL         │         │   - Binance WS       │
│   Railway            │         │   - Expo Push        │
│                      │         │   - Apple IAP        │
│                      │         │   - Google Play       │
└──────────────────────┘         └──────────────────────┘
```

### 1.2. Teknoloji Stack

**Frontend:**
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Charts:** TradingView Lightweight Charts
- **State Management:** React Hooks + Context API
- **Authentication:** NextAuth.js + Custom JWT
- **Mobile:** Capacitor 7 (iOS & Android)

**Backend:**
- **Framework:** Express.js
- **Runtime:** Node.js (ES Modules)
- **Database:** PostgreSQL (Railway)
- **WebSocket:** ws (Binance WebSocket)
- **Push Notifications:** Expo Push + Firebase FCM

**Infrastructure:**
- **Frontend Hosting:** Vercel Pro
- **Backend Hosting:** Railway
- **Database:** Railway PostgreSQL
- **CDN:** Vercel Edge Network

---

## 2. Backend Mimarisi (alertachart-backend)

### 2.1. Proje Yapısı

```
alertachart-backend/
├── src/
│   ├── index.js                 # Ana Express uygulaması
│   ├── routes/                   # API Route'ları
│   │   ├── auth.js               # Kimlik doğrulama
│   │   ├── push.js               # Push notification yönetimi
│   │   ├── alerts.js             # Fiyat uyarıları
│   │   ├── alarms.js             # Alarm abonelikleri
│   │   ├── historical.js         # Geçmiş veri API'si
│   │   ├── ticker.js             # Ticker verileri
│   │   ├── devices.js            # Cihaz yönetimi
│   │   └── admin.js              # Admin paneli
│   ├── lib/
│   │   ├── auth/                 # Auth kütüphaneleri
│   │   │   ├── db.js             # Auth database işlemleri
│   │   │   ├── jwt.js            # JWT token yönetimi
│   │   │   ├── password.js       # Şifre hash/verify
│   │   │   └── middleware.js    # Auth middleware
│   │   └── push/                 # Push notification kütüphaneleri
│   │       ├── db.js             # Push database işlemleri
│   │       ├── auto-price-alerts.js  # Otomatik fiyat uyarı servisi
│   │       ├── unified-push.js  # Birleşik push gönderimi
│   │       ├── expo-push.js      # Expo push servisi
│   │       ├── fcm-push.js       # Firebase FCM servisi
│   │       └── price-proximity.js # Fiyat yakınlık hesaplama
│   └── services/
│       └── exchangeService.js    # Exchange API servisleri
├── package.json
├── railway.json                  # Railway deployment config
└── README.md
```

### 2.2. Ana Uygulama (index.js)

**Özellikler:**
- Express.js server kurulumu
- CORS yapılandırması (Vercel + Railway için)
- Cookie parser middleware
- Route tanımlamaları
- Database initialization
- Auto Price Alert Service başlatma

**Başlatma Sırası:**
1. Express app oluşturulur
2. CORS ve middleware'ler yüklenir
3. Route'lar kaydedilir
4. Database bağlantıları initialize edilir
5. Auto Price Alert Service başlatılır
6. Server dinlemeye başlar

### 2.3. API Route'ları

#### 2.3.1. Auth Routes (`/api/auth`)

**Endpoints:**
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Email/şifre ile giriş
- `POST /api/auth/google` - Google OAuth girişi
- `POST /api/auth/apple` - Apple Sign In
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Kullanıcı bilgisi

**Özellikler:**
- JWT token tabanlı authentication
- Refresh token mekanizması
- Session yönetimi (database'de saklanır)
- OAuth2 entegrasyonu (Google, Apple)
- Şifre hash'leme (bcryptjs)

#### 2.3.2. Push Routes (`/api/push`)

**Endpoints:**
- `POST /api/push/register` - Cihaz kaydı
- `POST /api/push/unregister` - Cihaz kaydını silme
- `POST /api/push/test` - Test bildirimi gönderme

**Özellikler:**
- FCM ve Expo Push token desteği
- Cihaz-user ilişkilendirme
- Platform bazlı token yönetimi (iOS/Android)

#### 2.3.3. Alerts Routes (`/api/alerts`)

**Endpoints:**
- `GET /api/alerts` - Kullanıcının alert'lerini listele
- `POST /api/alerts` - Yeni alert oluştur
- `PUT /api/alerts/:id` - Alert güncelle
- `DELETE /api/alerts/:id` - Alert sil

**Özellikler:**
- Custom price alert'leri
- Symbol bazlı filtreleme
- Premium özellik kontrolü

#### 2.3.4. Historical Routes (`/api/historical`)

**Endpoint:**
- `GET /api/historical/:exchange/:pair/:timeframe`

**Query Parameters:**
- `from` - Başlangıç timestamp (ms)
- `to` - Bitiş timestamp (ms)
- `limit` - Maksimum mum sayısı (default: 1000, max: 5000)

**Desteklenen Exchange'ler:**
- BINANCE (Spot)
- BINANCE_FUTURES
- BYBIT
- OKX

**Özellikler:**
- Pagination desteği (sınırsız mum çekme)
- Rate limiting (exchange bazlı gecikmeler)
- Retry mekanizması
- Timeout yönetimi

#### 2.3.5. Ticker Routes (`/api/ticker`)

**Endpoint:**
- `GET /api/ticker/:marketType` (spot/futures)

**Query Parameters:**
- `symbols` - Virgülle ayrılmış sembol listesi

**Özellikler:**
- 15 saniye cache
- Binance WebSocket entegrasyonu
- Real-time fiyat güncellemeleri

### 2.4. Auto Price Alert Service

**Dosya:** `src/lib/push/auto-price-alerts.js`

**Amaç:** Önemli fiyat seviyelerine yaklaşınca premium kullanıcılara otomatik bildirim gönderme.

**İzlenen Coin'ler:**
- BTCUSDT (Bitcoin)
- ETHUSDT (Ethereum)
- SOLUSDT (Solana)
- BNBUSDT (Binance Coin)

**Özellikler:**
- WebSocket ile real-time fiyat takibi
- Hysteresis mekanizması (flickering önleme)
- Cooldown sistemi (5 dakika)
- Zona muerta (dead zone) toleransları
- Custom alert desteği
- Premium/Trial kullanıcı filtreleme

**Çalışma Mantığı:**
1. Binance WebSocket'e bağlanır
2. İzlenen coin'lerin fiyatlarını takip eder
3. Önemli seviyelere yaklaşımı kontrol eder (örn: BTC 100k, 105k, 110k)
4. Hysteresis ve cooldown kontrolü yapar
5. Premium kullanıcılara bildirim gönderir

### 2.5. Exchange Service

**Dosya:** `src/services/exchangeService.js`

**Fonksiyonlar:**
- `fetchBinanceCandles()` - Binance Spot mum verileri
- `fetchBinanceFuturesCandles()` - Binance Futures mum verileri
- `fetchBybitCandles()` - Bybit mum verileri
- `fetchOKXCandles()` - OKX mum verileri

**Pagination Stratejisi:**
1. İlk istek: 1000 mum çek
2. Eğer 1000 mum dönerse, daha fazla veri var demektir
3. Son mumun timestamp'inden devam et
4. Maksimum limit'e (5000) ulaşana kadar tekrarla

**Rate Limiting:**
- Binance: 100ms gecikme
- Bybit: 100ms gecikme
- OKX: 150ms gecikme

### 2.6. Database Bağlantısı

**Kullanılan Kütüphane:** `postgres` (v3.4.7)

**Connection Pool Ayarları:**
```javascript
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 20,              // Maksimum 20 bağlantı
  idle_timeout: 30,     // 30 saniye idle timeout
  connect_timeout: 10,   // 10 saniye connection timeout
});
```

**Kullanılan Tablolar:**
- `users` - Kullanıcı bilgileri
- `user_sessions` - Session yönetimi
- `devices` - Cihaz kayıtları
- `price_alerts` - Fiyat uyarıları
- `alarm_subscriptions` - Alarm abonelikleri

---

## 3. Frontend Mimarisi (alertachart)

### 3.1. Proje Yapısı

```
alertachart/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Ana sayfa (2775 satır)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global stiller
│   ├── api/                      # API Routes (Next.js)
│   │   ├── auth/                 # Auth endpoints
│   │   ├── push/                 # Push endpoints
│   │   ├── historical/           # Historical data (proxy)
│   │   ├── ticker/               # Ticker data (proxy)
│   │   ├── alerts/               # Alert yönetimi
│   │   ├── subscription/         # Premium subscription
│   │   └── admin/                # Admin paneli
│   ├── admin/                    # Admin panel sayfaları
│   ├── auth/                     # Auth sayfaları
│   ├── blog/                     # Blog sayfaları
│   └── news/                     # Haber sayfaları
├── components/                   # React bileşenleri
│   ├── chart/                    # Chart bileşenleri
│   │   ├── Chart.tsx             # Ana chart component
│   │   ├── ChartCache.ts         # Veri cache sistemi
│   │   ├── DrawingToolbar.tsx    # Çizim araçları
│   │   └── DrawingRenderer.tsx  # Çizim renderer
│   ├── AlertsPanel.tsx           # Alert paneli
│   ├── Watchlist.tsx             # İzleme listesi
│   ├── AuthModal.tsx             # Auth modal
│   └── login/                    # Platform-specific login
│       ├── AndroidLogin.tsx
│       ├── IOSLogin.tsx
│       └── DefaultLogin.tsx
├── services/                     # Servis katmanı
│   ├── websocketService.ts       # WebSocket servisi
│   ├── historicalService.ts         # Historical data servisi
│   ├── alertService.ts           # Alert yönetimi
│   ├── authService.ts            # Auth servisi
│   ├── pushNotificationService.ts # Push notification
│   └── iapService.ts             # In-App Purchase
├── workers/                      # Web Workers
│   ├── aggregator.ts             # Trade aggregator
│   ├── BaseExchange.ts           # Base exchange class
│   └── exchanges/                # Exchange implementasyonları
│       ├── BinanceExchange.ts
│       ├── BinanceFuturesExchange.ts
│       ├── BybitExchange.ts
│       └── OKXExchange.ts
├── types/                        # TypeScript tipleri
│   ├── chart.ts                  # Chart tipleri
│   ├── alert.ts                  # Alert tipleri
│   └── exchange.ts               # Exchange tipleri
├── utils/                        # Yardımcı fonksiyonlar
│   ├── constants.ts              # Sabitler
│   ├── helpers.ts                # Yardımcı fonksiyonlar
│   ├── premium.ts                # Premium kontrolü
│   └── translations.ts           # Çeviri sistemi
├── lib/                          # Kütüphaneler
│   └── db.ts                     # Database bağlantısı
└── public/                       # Statik dosyalar
```

### 3.2. Ana Sayfa (app/page.tsx)

**Özellikler:**
- Multi-chart layout (1x1, 1x2, 2x2, 3x3)
- Real-time chart rendering
- Drawing tools (trend lines, support/resistance)
- Alert yönetimi
- Watchlist
- Premium özellik kontrolü
- Platform detection (iOS/Android/Web)
- Responsive design

**State Yönetimi:**
- React Hooks (useState, useEffect, useMemo)
- Context API (SessionProvider)
- LocalStorage cache (premium status)

### 3.3. Chart Sistemi

#### 3.3.1. Chart Component (`components/chart/Chart.tsx`)

**Kütüphane:** TradingView Lightweight Charts

**Özellikler:**
- Real-time candlestick rendering
- Multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- Drawing tools (trend lines, horizontal lines)
- Volume bars
- Price markers
- Crosshair

**Veri Kaynakları:**
1. **Historical Data:** Backend API (Railway)
2. **Real-time Trades:** WebSocket (Web Worker)
3. **Ticker Data:** WebSocket Service

#### 3.3.2. Chart Cache (`components/chart/ChartCache.ts`)

**Amaç:** Veri cache yönetimi ve lazy loading

**Özellikler:**
- Chunk-based caching
- Lazy loading (scroll back)
- Cache invalidation
- Memory management

#### 3.3.3. Drawing System

**Bileşenler:**
- `DrawingToolbar.tsx` - Çizim araçları toolbar'ı
- `DrawingRenderer.tsx` - Çizimleri render eden component
- `DrawingPropertiesModal.tsx` - Çizim özellikleri modal'ı

**Desteklenen Çizimler:**
- Trend Lines
- Horizontal Lines (Support/Resistance)
- Price Markers

### 3.4. Web Worker Sistemi

#### 3.4.1. Aggregator (`workers/aggregator.ts`)

**Amaç:** Trade'leri toplayıp bar'lara dönüştürme (aggr.trade tarzı)

**Özellikler:**
- Real-time trade aggregation
- Multiple exchange desteği
- Timeframe bazlı bar oluşturma
- Event-based communication

**Çalışma Mantığı:**
1. Exchange WebSocket'lerine bağlanır
2. Trade'leri alır
3. Timeframe'e göre bar'lara gruplar
4. Chart'a emit eder

#### 3.4.2. Exchange Implementations

**BaseExchange.ts:** Tüm exchange'ler için base class

**Desteklenen Exchange'ler:**
- Binance (Spot)
- Binance Futures
- Bybit
- OKX

**Her Exchange:**
- WebSocket bağlantısı yönetir
- Trade formatını normalize eder
- Event emit eder

### 3.5. Servisler

#### 3.5.1. WebSocket Service (`services/websocketService.ts`)

**Amaç:** Binance WebSocket ile real-time fiyat güncellemeleri

**Özellikler:**
- Auto-reconnect
- Symbol subscription management
- Market type support (spot/futures)
- Callback system

#### 3.5.2. Historical Service (`services/historicalService.ts`)

**Amaç:** Geçmiş mum verilerini çekme

**Özellikler:**
- Railway backend entegrasyonu
- Fallback mekanizması (Next.js API)
- Cache yönetimi
- Lazy loading (fetchOlder)

**Veri Akışı:**
1. İlk yükleme: Next.js API (hızlı)
2. Lazy loading: Railway backend (pagination)
3. Fallback: Railway başarısız olursa Next.js API

#### 3.5.3. Alert Service (`services/alertService.ts`)

**Amaç:** Fiyat uyarılarını yönetme

**Özellikler:**
- CRUD işlemleri
- Backend API entegrasyonu
- Real-time trigger kontrolü

#### 3.5.4. Auth Service (`services/authService.ts`)

**Amaç:** Kimlik doğrulama yönetimi

**Özellikler:**
- NextAuth.js entegrasyonu
- Custom JWT handling
- Session yönetimi
- Platform-specific auth (iOS/Android/Web)

#### 3.5.5. Push Notification Service (`services/pushNotificationService.ts`)

**Amaç:** Push notification yönetimi

**Özellikler:**
- Device registration
- Token yönetimi
- Platform detection
- Backend API entegrasyonu

### 3.6. API Routes (Next.js)

**Amaç:** Backend'e proxy yapma ve database işlemleri

**Proxy Route'lar:**
- `/api/auth/*` → Backend'e proxy
- `/api/push/*` → Backend'e proxy
- `/api/historical/*` → Backend'e proxy
- `/api/ticker/*` → Backend'e proxy

**Direct Database Route'lar:**
- `/api/user/plan` → Database'den premium durumu
- `/api/subscription/*` → Premium subscription yönetimi
- `/api/notifications` → Bildirim yönetimi
- `/api/blog/*` → Blog içerik yönetimi
- `/api/admin/*` → Admin paneli

### 3.7. Database Bağlantısı

**Dosya:** `lib/db.ts`

**Kütüphane:** `postgres` (v3.4.7)

**Özellikler:**
- Singleton pattern
- Connection pooling (max 20)
- Neon ve Railway desteği
- Auto SSL detection

**Kullanılan Tablolar:**
- `users` - Kullanıcı bilgileri
- `premium_subscriptions` - Premium abonelikler
- `notifications` - Bildirimler
- `blog_posts` - Blog yazıları
- `news` - Haberler
- `support_requests` - Destek talepleri

---

## 4. Database Mimarisi

### 4.1. Database Yapısı

**Platform:** Railway PostgreSQL

**Connection String Format:**
```
postgresql://postgres:PASSWORD@HOST:5432/railway?sslmode=require
```

### 4.2. Tablolar

#### 4.2.1. Auth Tabloları

**users**
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- created_at (TIMESTAMP)
- last_login (TIMESTAMP)
- premium_until (TIMESTAMP)
- is_premium (BOOLEAN)
- trial_started_at (TIMESTAMP)
- trial_ends_at (TIMESTAMP)
```

**user_sessions**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- refresh_token (VARCHAR UNIQUE)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### 4.2.2. Push Notification Tabloları

**devices**
```sql
- id (SERIAL PRIMARY KEY)
- device_id (VARCHAR UNIQUE)
- user_id (INTEGER FOREIGN KEY)
- push_token (VARCHAR)
- platform (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

**price_alerts**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- device_id (INTEGER FOREIGN KEY)
- symbol (VARCHAR)
- target_price (DECIMAL)
- condition (VARCHAR) -- 'above', 'below'
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

**alarm_subscriptions**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- device_id (INTEGER FOREIGN KEY)
- symbol (VARCHAR)
- alarm_type (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

#### 4.2.3. Content Tabloları

**blog_posts**
```sql
- id (SERIAL PRIMARY KEY)
- slug (VARCHAR UNIQUE)
- title (VARCHAR)
- content (TEXT)
- excerpt (TEXT)
- published_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

**news**
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- content (TEXT)
- source (VARCHAR)
- published_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

**notifications**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- title (VARCHAR)
- message (TEXT)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)
```

**support_requests**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- user_email (VARCHAR)
- topic (VARCHAR)
- message (TEXT)
- status (VARCHAR)
- admin_notes (TEXT)
- created_at (TIMESTAMP)
```

### 4.3. Foreign Key İlişkileri

```
users (root table)
  ├── user_sessions
  ├── devices
  │   ├── price_alerts
  │   └── alarm_subscriptions
  ├── notifications
  └── support_requests
```

### 4.4. Connection Pooling

**Frontend (Vercel):**
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 10s

**Backend (Railway):**
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 10s

**Toplam:** Maksimum 40 eşzamanlı bağlantı

---

## 5. Servisler ve Bağımlılıklar

### 5.1. Frontend Bağımlılıkları

**Backend (Railway):**
- ✅ Yüksek bağımlılık
- Auth, push, ticker, historical data için gerekli
- Fallback: Historical data için Next.js API

**Database (Railway PostgreSQL):**
- ✅ Yüksek bağımlılık
- User management, subscription, notifications için gerekli
- Fallback: Yok

**External APIs:**
- Binance WebSocket (real-time data)
- Expo Push Service (notifications)
- Apple/Google IAP (premium verification)

### 5.2. Backend Bağımlılıkları

**Database (Railway PostgreSQL):**
- ✅ Yüksek bağımlılık
- Tüm backend servisleri database'e bağlı
- Fallback: Yok

**External APIs:**
- Binance WebSocket (price updates)
- Expo Push Service (notifications)
- Firebase FCM (Android notifications)
- Apple Receipt API (IAP verification)
- Google Play API (IAP verification)

**Frontend (Vercel):**
- ⚠️ Düşük bağımlılık
- Sadece proxy request'leri alır
- Fallback: Yok (frontend backend'e bağımlı)

### 5.3. Bağımlılık Haritası

```
Frontend (Vercel)
  ├── Backend (Railway) [Proxy]
  │   ├── Auth endpoints
  │   ├── Push endpoints
  │   ├── Ticker data
  │   └── Historical data
  │
  ├── Database (Railway PostgreSQL) [Direct]
  │   ├── User management
  │   ├── Subscription
  │   ├── Notifications
  │   ├── Blog & News
  │   └── Support requests
  │
  └── External APIs
      ├── Binance WebSocket
      └── IAP Services

Backend (Railway)
  ├── Database (Railway PostgreSQL) [Direct]
  │   ├── Auth data
  │   ├── Push data
  │   ├── Price alerts
  │   └── Alarm subscriptions
  │
  └── External APIs
      ├── Binance WebSocket
      ├── Expo Push Service
      ├── Firebase FCM
      ├── Apple Receipt API
      └── Google Play API
```

---

## 6. Veri Akışı ve İletişim

### 6.1. Authentication Flow

```
1. User Login
   ↓
2. Frontend: /api/auth/login (Next.js API)
   ↓
3. Proxy to Backend: /api/auth/login (Express.js)
   ↓
4. Backend: Database'de kullanıcı doğrula
   ↓
5. Backend: JWT token oluştur
   ↓
6. Backend: Cookie set et + Response
   ↓
7. Frontend: Cookie al + Session oluştur
   ↓
8. User: Authenticated
```

### 6.2. Historical Data Flow

```
1. User scrolls chart / changes timeframe
   ↓
2. Frontend: HistoricalService.fetch()
   ↓
3. İlk yükleme: Next.js API (/api/historical)
   OR
   Lazy loading: Railway Backend (/api/historical)
   ↓
4. Backend: Exchange API'den veri çek (Binance/Bybit/OKX)
   ↓
5. Backend: Pagination ile tüm veriyi topla
   ↓
6. Backend: Response döndür
   ↓
7. Frontend: Chart'a veri yükle
```

### 6.3. Real-time Data Flow

```
1. Chart component mounts
   ↓
2. WebSocket Service: Binance WebSocket'e bağlan
   ↓
3. Web Worker: Exchange WebSocket'lerine bağlan
   ↓
4. WebSocket: Trade'leri al
   ↓
5. Aggregator: Trade'leri bar'lara dönüştür
   ↓
6. Chart: Real-time güncelleme
```

### 6.4. Push Notification Flow

```
1. User creates price alert
   ↓
2. Frontend: /api/alerts (Backend'e proxy)
   ↓
3. Backend: Alert'i database'e kaydet
   ↓
4. Auto Price Alert Service: Fiyatı izlemeye başla
   ↓
5. Fiyat hedefe ulaştı
   ↓
6. Backend: Premium kullanıcıları bul
   ↓
7. Backend: Unified Push Service'e gönder
   ↓
8. Unified Push: Platform'a göre (Expo/FCM) bildirim gönder
   ↓
9. User: Bildirim alır
```

### 6.5. Premium Subscription Flow

```
1. User purchases premium (iOS/Android)
   ↓
2. Frontend: /api/subscription/verify-purchase
   ↓
3. Frontend: IAP Service ile receipt doğrula
   ↓
4. Frontend: Database'e premium kaydı yap
   ↓
5. Frontend: Cache'i güncelle
   ↓
6. User: Premium özelliklere erişir
```

---

## 7. Güvenlik ve Kimlik Doğrulama

### 7.1. Authentication Mekanizması

**JWT Token Sistemi:**
- Access Token: Kısa ömürlü (1 saat)
- Refresh Token: Uzun ömürlü (7 gün)
- Database'de session yönetimi

**Token Yapısı:**
```javascript
{
  userId: number,
  email: string,
  iat: number,
  exp: number
}
```

### 7.2. Password Security

**Hash Algoritması:** bcryptjs
- Salt rounds: 10
- Database'de sadece hash saklanır

### 7.3. OAuth Integration

**Google OAuth:**
- OAuth2Client kullanımı
- Token verification
- User bilgisi çekme

**Apple Sign In:**
- apple-signin-auth kütüphanesi
- Identity token verification
- User bilgisi çekme

### 7.4. CORS Yapılandırması

**Backend CORS:**
```javascript
allowedOrigins: [
  'https://www.alertachart.com',
  'https://alertachart.com',
  'https://*.vercel.app',
  'https://aggr.alertachart.com'
]
credentials: true // Cookie desteği
```

### 7.5. Security Headers (Frontend)

**Next.js Headers:**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

---

## 8. Push Notification Sistemi

### 8.1. Unified Push Service

**Dosya:** `backend/src/lib/push/unified-push.js`

**Amaç:** Platform-agnostic push notification gönderimi

**Desteklenen Platformlar:**
- iOS: Expo Push Notifications
- Android: Firebase Cloud Messaging (FCM)

**Çalışma Mantığı:**
1. Platform detection (token formatına göre)
2. iOS: Expo Push Service'e gönder
3. Android: Firebase Admin SDK ile FCM'e gönder

### 8.2. Auto Price Alert Service

**Dosya:** `backend/src/lib/push/auto-price-alerts.js`

**Özellikler:**
- Real-time fiyat takibi (WebSocket)
- Önemli seviye yaklaşımı kontrolü
- Hysteresis mekanizması
- Cooldown sistemi
- Premium kullanıcı filtreleme

**İzlenen Seviyeler:**
- BTC: 100k, 105k, 110k, 115k, 120k...
- ETH: 4k, 4.5k, 5k, 5.5k, 6k...
- SOL: 200, 250, 300, 350, 400...
- BNB: 600, 650, 700, 750, 800...

### 8.3. Custom Price Alerts

**Özellikler:**
- Kullanıcı tanımlı fiyat seviyeleri
- Symbol bazlı filtreleme
- Above/Below koşulları
- Premium özellik

---

## 9. Mobil Uygulama Mimarisi

### 9.1. Capacitor Entegrasyonu

**Framework:** Capacitor 7

**Platformlar:**
- iOS (Capacitor iOS)
- Android (Capacitor Android)

### 9.2. Platform-Specific Features

**iOS:**
- Apple Sign In (@capacitor-community/apple-sign-in)
- Push Notifications (@capacitor/push-notifications)
- Local Notifications (@capacitor/local-notifications)
- In-App Purchase (native)

**Android:**
- Google Sign In (@codetrix-studio/capacitor-google-auth)
- Push Notifications (FCM)
- Local Notifications
- In-App Purchase (native)

### 9.3. Platform Detection

**Dosya:** `utils/platformDetection.ts`

**Özellikler:**
- Capacitor platform detection
- iOS/Android/Web ayrımı
- Platform-specific login component'leri

### 9.4. Native Login Components

**iOS Login:** `components/login/IOSLogin.tsx`
- Apple Sign In button
- Native Apple authentication

**Android Login:** `components/login/AndroidLogin.tsx`
- Google Sign In button
- Native Google authentication

**Default Login:** `components/login/DefaultLogin.tsx`
- Email/Password
- Web OAuth (Google/Apple)

### 9.5. Build Process

**iOS:**
- Xcode project: `ios/App/App.xcodeproj`
- Build script: `prepare-ios-build.sh`
- Capacitor sync: `npx cap sync ios`

**Android:**
- Android project: `android/`
- Gradle build
- Capacitor sync: `npx cap sync android`

---

## 10. Deployment ve Infrastructure

### 10.1. Frontend Deployment (Vercel)

**Platform:** Vercel Pro ($20/ay)

**Domain:** www.alertachart.com

**Build Process:**
1. Git push to main branch
2. Vercel otomatik build
3. Next.js production build
4. Edge network'e deploy

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection
- `BACKEND_URL` - Railway backend URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - NextAuth URL

### 10.2. Backend Deployment (Railway)

**Platform:** Railway

**Domain:** alertachart-backend-production.up.railway.app

**Build Process:**
1. Git push to main branch
2. Railway otomatik build
3. Node.js production start
4. Health check endpoint

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection
- `PORT` - Server port (default: 3002)
- `ALLOWED_ORIGINS` - CORS origins
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth
- `APPLE_CLIENT_ID` - Apple Sign In
- `EXPO_ACCESS_TOKEN` - Expo Push token
- `FIREBASE_PROJECT_ID` - Firebase project ID

### 10.3. Database (Railway PostgreSQL)

**Platform:** Railway PostgreSQL

**Plan:** Railway Pro ($20/ay)

**Özellikler:**
- 8GB storage
- Automated backups
- Connection pooling
- SSL support

---

## 11. Özet ve Kritik Noktalar

### 11.1. Sistem Özeti

**Frontend:**
- Next.js 15 + React 19
- Vercel Pro hosting
- Real-time charting
- Multi-platform (Web/iOS/Android)

**Backend:**
- Express.js
- Railway hosting
- Real-time price alerts
- Push notification service

**Database:**
- PostgreSQL (Railway)
- Connection pooling
- Multi-service access

### 11.2. Kritik Bağımlılıklar

1. **Frontend → Backend:** Yüksek (Auth, Push, Data)
2. **Frontend → Database:** Yüksek (User, Subscription)
3. **Backend → Database:** Yüksek (Tüm servisler)
4. **Backend → External APIs:** Orta (Fallback mekanizmaları var)

### 11.3. Ölçeklenebilirlik

**Frontend:**
- Vercel Edge Network (global CDN)
- Serverless functions (otomatik ölçekleme)
- Static asset optimization

**Backend:**
- Railway auto-scaling
- Connection pooling (20 connections)
- Rate limiting (exchange APIs)

**Database:**
- Connection pooling (40 total connections)
- Index optimization
- Query optimization

### 11.4. Güvenlik

- JWT token authentication
- Password hashing (bcrypt)
- CORS yapılandırması
- Security headers
- SSL/TLS encryption

### 11.5. Monitoring ve Logging

**Frontend:**
- Vercel Analytics
- Console logging (production'da minimize)

**Backend:**
- Railway logs
- Console logging
- Error handling

---

## 12. Geliştirme Notları

### 12.1. Local Development

**Frontend:**
```bash
npm run dev
# http://localhost:3000
```

**Backend:**
```bash
cd alertachart-backend
npm run dev
# http://localhost:3002
```

**Database:**
- Railway PostgreSQL (development database)
- Local PostgreSQL (optional)

### 12.2. Environment Variables

**Frontend (.env.local):**
```
DATABASE_URL=postgresql://...
BACKEND_URL=http://localhost:3002
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Backend (.env):**
```
DATABASE_URL=postgresql://...
PORT=3002
ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=...
```

### 12.3. Testing

**API Testing:**
- `API_TEST_COMMANDS.sh` - API endpoint testleri
- Postman collection (optional)

**Manual Testing:**
- Premium özellikler
- Push notifications
- IAP verification

---

**Son Güncelleme:** 2024
**Versiyon:** 6.1.0
**Dokümantasyon:** MIMARI_DOKUMANTASYON.md
