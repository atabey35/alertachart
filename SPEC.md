# 📋 Alerta Chart - Sistem Spesifikasyon Dökümanı

## 📖 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Amaç ve Misyon](#amaç-ve-misyon)
3. [Temel Özellikler](#temel-özellikler)
4. [Hizmetler ve Fonksiyonlar](#hizmetler-ve-fonksiyonlar)
5. [Teknik Mimari](#teknik-mimari)
6. [Platform Desteği](#platform-desteği)
7. [API Dokümantasyonu](#api-dokümantasyonu)
8. [Kullanıcı Senaryoları](#kullanıcı-senaryoları)
9. [Güvenlik ve Gizlilik](#güvenlik-ve-gizlilik)
10. [Performans Özellikleri](#performans-özellikleri)

---

## 🎯 Genel Bakış

**Alerta Chart**, profesyonel kripto para analizi ve fiyat takibi için geliştirilmiş, modern ve kapsamlı bir platformdur. TradingView benzeri özellikler sunarak, hem web hem de mobil platformlarda kullanıcılara gerçek zamanlı grafik analizi, teknik indikatörler, fiyat alarmları ve push notification hizmetleri sağlar.

### Temel Bilgiler

- **Platform Adı**: Alerta Chart
- **Versiyon**: 1.2.1 (Web), 1.0.0 (Mobile)
- **Web URL**: https://alerta.kriptokirmizi.com
- **Mobil Uygulama**: iOS & Android (Google Play Store)
- **Lisans**: MIT
- **Geliştirici**: Atabey

---

## 🎯 Amaç ve Misyon

### Ana Amaç

Alerta Chart, kripto para yatırımcıları ve trader'lar için **ücretsiz, profesyonel seviyede** bir grafik analiz platformu sunmaktadır. TradingView PRO özelliklerine benzer işlevsellik sağlayarak, kullanıcıların:

- ✅ **Gerçek zamanlı** fiyat hareketlerini takip etmelerini
- ✅ **Teknik analiz** yapmalarını
- ✅ **Fiyat alarmları** kurarak önemli seviyeleri kaçırmamalarını
- ✅ **Mobil cihazlarda** her zaman bildirim almalarını
- ✅ **Çoklu grafik** düzenleri ile farklı coin'leri aynı anda analiz etmelerini

sağlamaktadır.

### Hedef Kitle

1. **Aktif Trader'lar**: Günlük işlem yapan, teknik analiz yapan kullanıcılar
2. **Yatırımcılar**: Uzun vadeli pozisyon takibi yapan kullanıcılar
3. **Analistler**: Detaylı grafik analizi yapan profesyoneller
4. **Hobici Kullanıcılar**: Kripto para piyasasını öğrenmek isteyenler

---

## ✨ Temel Özellikler

### 1. 📊 Gerçek Zamanlı Grafik Analizi

#### Çoklu Exchange Desteği
- **Binance** (Spot & Futures)
-

#### Zaman Dilimleri (Timeframes)
- 1 dakika (1m)
- 5 dakika (5m)
- 15 dakika (15m)
- 1 saat (1h)
- 4 saat (4h)
- 1 gün (1d)

#### Grafik Türleri
- **Candlestick (Mum) Grafikleri**: Açılış, kapanış, yüksek, düşük fiyat gösterimi
- **Volume (Hacim) Analizi**: Alış/satış hacmi ayrımı
- **Gerçek Zamanlı Güncelleme**: WebSocket üzerinden canlı veri akışı

### 2. 📈 Teknik İndikatörler

#### Momentum İndikatörleri
- **RSI (Relative Strength Index)**: 14 periyot, aşırı alım/satım seviyeleri
- **MACD (Moving Average Convergence Divergence)**: Trend takibi ve sinyal üretimi
  - Fast EMA: 12
  - Slow EMA: 26
  - Signal: 9

#### Trend İndikatörleri
- **EMA (Exponential Moving Average)**: 50, 100, 200 periyot
- **SMA (Simple Moving Average)**: 50, 100, 200 periyot
- **Bollinger Bands**: Volatilite analizi
  - Periyot: 20
  - Standart Sapma: 2

#### Volume İndikatörleri
- **Volume Profile**: Alış/satış hacmi ayrımı
- **Volume Bars**: Zaman bazlı hacim gösterimi

### 3. 🎨 Çizim Araçları

#### Desteklenen Çizimler
- **Trend Lines (Trend Çizgileri)**: Destek/direnç seviyeleri
- **Fibonacci Retracement**: Geri çekilme seviyeleri
- **Horizontal Lines**: Yatay seviye çizgileri
- **Vertical Lines**: Dikey zaman işaretleri
- **Rectangles**: Dikdörtgen alan işaretleme
- **Text Annotations**: Metin notları

#### Çizim Özellikleri
- Renk özelleştirme
- Çizgi kalınlığı ayarlama
- Çizimleri kaydetme/yükleme
- Çoklu çizim desteği

### 4. 🔔 Fiyat Alarmları ve Bildirimler

#### Alarm Türleri
1. **Fiyat Geçiş Alarmları**
   - Belirli bir fiyat seviyesine ulaşıldığında tetiklenir
   - Yukarı (above) veya aşağı (below) yönlü
   - Sesli uyarı + push notification

2. **Yaklaşma Bildirimleri (Proximity Alerts)**
   - Hedef fiyata yaklaşıldığında bildirim
   - Özelleştirilebilir yaklaşma aralığı
   - Otomatik cooldown (spam önleme)

3. **Otomatik Fiyat Uyarıları**
   - BTC, ETH, SOL, BNB için önemli seviyelere yaklaşınca otomatik bildirim
   - Yuvarlak sayılara yaklaşma (örn: BTC 100k, ETH 4k)
   - Tüm kullanıcılara gönderilir

#### Bildirim Kanalları
- **Web Bildirimleri**: Tarayıcı üzerinden
- **Mobil Push Notifications**: iOS & Android
- **Sesli Uyarılar**: Alarm tetiklendiğinde
- **E-posta Bildirimleri**: (Gelecek özellik)

### 5. 📱 Mobil Uygulama Özellikleri

#### Native Mobil Deneyim
- **iOS & Android** desteği
- **WebView Entegrasyonu**: Web uygulamasını native container içinde çalıştırma
- **Native Bridge**: Web ↔ Mobile iletişim köprüsü
- **Push Notification**: Foreground/Background/Terminated durumlarında çalışır

#### Mobil Özellikler
- **Pull-to-Refresh**: Sayfa yenileme
- **Bottom Navigation**: Kolay navigasyon
- **Watchlist**: Favori coin'leri takip
- **Alarm Yönetimi**: Mobilden alarm kurma/silme
- **Offline Mode**: Son görüntülenen verileri saklama

### 6. 📋 Watchlist (İzleme Listesi)

#### Özellikler
- **Çoklu Coin Takibi**: Sınırsız coin ekleme
- **Kategori Yönetimi**: Coin'leri kategorilere ayırma (MAJOR, DEFI, MEME, vb.)
- **Favoriler**: Önemli coin'leri işaretleme
- **Gerçek Zamanlı Fiyat**: Canlı fiyat güncellemeleri
- **24 Saat Değişim**: Yüzde ve dolar bazlı değişim
- **Volume Takibi**: 24 saatlik işlem hacmi
- **Drag & Drop**: Sıralama değiştirme
- **Hızlı Erişim**: Tek tıkla grafiğe geçiş

### 7. 🎛️ Çoklu Grafik Düzenleri

#### Desteklenen Düzenler
- **1x1**: Tek grafik (varsayılan)
- **1x2**: İki grafik dikey
- **2x2**: Dört grafik grid
- **3x3**: Dokuz grafik grid

#### Özellikler
- Her grafik bağımsız çalışır
- Farklı coin'ler ve zaman dilimleri
- Senkronize zoom ve pan
- Bağımsız indikatör ayarları

### 8. 👤 Kullanıcı Hesabı ve Kimlik Doğrulama

#### Özellikler
- **Kayıt/Giriş Sistemi**: E-posta ve şifre ile
- **JWT Token**: Güvenli kimlik doğrulama
- **Cihaz Bağlama**: Her cihaz kullanıcıya bağlı
- **Çoklu Cihaz Desteği**: Aynı hesap, farklı cihazlar
- **Oturum Yönetimi**: Refresh token ile uzun süreli oturum

#### Güvenlik
- Şifre hash'leme (bcrypt)
- Secure token storage (mobile)
- HTTPS iletişim
- CORS koruması

---

## 🛠️ Hizmetler ve Fonksiyonlar

### 1. Grafik Servisleri

#### Historical Data Service
- **Endpoint**: `/api/historical/:from/:to/:timeframe/:markets`
- **Fonksiyon**: Geçmiş fiyat verilerini getirir
- **Özellikler**:
  - Çoklu exchange desteği
  - Zaman aralığı filtreleme
  - Chunk-based caching
  - Otomatik veri birleştirme

#### Real-time Data Service
- **WebSocket Bağlantıları**: Her exchange için ayrı bağlantı
- **Trade Aggregation**: İşlemleri zaman dilimine göre gruplama
- **Özellikler**:
  - Otomatik yeniden bağlanma
  - Hata yönetimi
  - Performans optimizasyonu

### 2. Alarm Servisleri

#### Alert Service (Frontend)
- **Fonksiyonlar**:
  - Alarm oluşturma/güncelleme/silme
  - Fiyat takibi ve tetikleme
  - Sesli uyarı
  - Push notification entegrasyonu
- **Storage**: LocalStorage'da saklama
- **Real-time Check**: Her fiyat güncellemesinde kontrol

#### Price Proximity Service (Backend)
- **Fonksiyonlar**:
  - WebSocket ile canlı fiyat takibi
  - Yaklaşma kontrolü
  - Bildirim gönderimi
  - Cooldown yönetimi (30 dakika)
- **Desteklenen Coin'ler**: BTC, ETH, SOL, BNB

#### Auto Price Alert Service (Backend)
- **Fonksiyonlar**:
  - Önemli seviyelere yaklaşma tespiti
  - Tüm kullanıcılara otomatik bildirim
  - Yuvarlak sayı seviyeleri (1000, 100, 10, 50)
- **Cooldown**: 15 dakika

### 3. Push Notification Servisleri

#### Expo Push Notification Service
- **Platform**: iOS & Android
- **Fonksiyonlar**:
  - Token kayıt/yönetimi
  - Bildirim gönderimi
  - Channel yönetimi (price-alerts, alarms)
  - Badge yönetimi

#### Notification Channels (Android)
- **default**: Genel bildirimler
- **price-alerts**: Fiyat uyarıları
- **alarms**: Alarm bildirimleri

### 4. Kullanıcı Yönetimi Servisleri

#### Authentication Service
- **Fonksiyonlar**:
  - Kullanıcı kaydı
  - Giriş/çıkış
  - Token yenileme
  - Kullanıcı bilgisi getirme

#### Device Management
- **Fonksiyonlar**:
  - Cihaz kaydı
  - Push token yönetimi
  - Cihaz-hesap bağlama
  - Çoklu cihaz desteği

### 5. Admin Servisleri

#### Broadcast Service
- **Fonksiyonlar**:
  - Tüm kullanıcılara bildirim gönderme
  - Özel mesaj gönderme
  - Toplu bildirim

#### Analytics Service
- **Fonksiyonlar**:
  - Aktif kullanıcı sayısı
  - Cihaz istatistikleri
  - Bildirim istatistikleri

---

## 🏗️ Teknik Mimari

### Frontend (Web)

#### Teknolojiler
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 18
- **Charting Library**: lightweight-charts (TradingView)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **Web Workers**: Real-time data aggregation

#### Mimari Özellikler
- **Web Worker Architecture**: Veri işleme ayrı thread'de
- **Chunk-based Caching**: Verimli bellek kullanımı
- **Component-based**: Modüler yapı
- **TypeScript**: Tip güvenliği

### Backend

#### Teknolojiler
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Push Service**: Expo Server SDK
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt

#### Servisler
- **Historical Data API**: Geçmiş veri sağlama
- **Ticker API**: Anlık fiyat bilgisi
- **Push Notification Service**: Bildirim gönderimi
- **Auth Service**: Kimlik doğrulama
- **Admin Service**: Yönetim paneli

### Mobile

#### Teknolojiler
- **Framework**: React Native (Expo)
- **WebView**: react-native-webview
- **Push Notifications**: expo-notifications
- **Secure Storage**: expo-secure-store
- **Platform**: iOS & Android

#### Mimari
- **WebView Container**: Web uygulamasını native container içinde
- **Native Bridge**: Web ↔ Native iletişim
- **Push Token Management**: Otomatik token yönetimi
- **Device ID**: Benzersiz cihaz tanımlama

### Database Schema

#### Tables
1. **users**: Kullanıcı bilgileri
2. **user_sessions**: Refresh token'lar
3. **devices**: Cihaz kayıtları
4. **price_alerts**: Fiyat uyarıları
5. **alarm_subscriptions**: Alarm abonelikleri

---

## 📱 Platform Desteği

### Web Platform
- **Tarayıcılar**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Desktop, Tablet, Mobile
- **PWA Support**: Progressive Web App (gelecek)

### Mobile Platform
- **iOS**: 13.0+
- **Android**: 8.0+ (API Level 26+)
- **App Stores**: Google Play Store, Apple App Store (gelecek)

### Deployment
- **Web**: Vercel
- **Backend**: Railway
- **Database**: Neon PostgreSQL
- **CDN**: Vercel Edge Network

---

## 📡 API Dokümantasyonu

### Public Endpoints

#### Historical Data
```
GET /api/historical/:from/:to/:timeframe/:markets
```
- **Açıklama**: Geçmiş fiyat verilerini getirir
- **Parametreler**:
  - `from`: Başlangıç timestamp (ms)
  - `to`: Bitiş timestamp (ms)
  - `timeframe`: Zaman dilimi (saniye)
  - `markets`: Market listesi (virgülle ayrılmış)

#### Ticker Data
```
GET /api/ticker/:marketType?symbols=SYMBOL1,SYMBOL2
```
- **Açıklama**: Anlık fiyat bilgisi
- **Parametreler**:
  - `marketType`: spot veya futures
  - `symbols`: Coin sembolleri

### Authenticated Endpoints

#### Push Notification
```
POST /api/push/register
POST /api/push/unregister
POST /api/push/test
```

#### Price Alerts
```
POST /api/alerts/price
GET /api/alerts/price?deviceId=xxx
PATCH /api/alerts/price
DELETE /api/alerts/price
```

#### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

#### Alarms
```
POST /api/alarms/notify
```

### Admin Endpoints

#### Broadcast
```
POST /api/admin/broadcast
```

---

## 👥 Kullanıcı Senaryoları

### Senaryo 1: Günlük Trader
**Kullanıcı**: Aktif trader, günlük işlem yapıyor

**İhtiyaçlar**:
- Gerçek zamanlı fiyat takibi
- Teknik indikatörler (RSI, MACD)
- Çoklu grafik düzeni
- Hızlı alarm kurma

**Çözüm**:
1. 2x2 grafik düzeni açılır
2. BTC, ETH, SOL, BNB aynı anda takip edilir
3. RSI ve MACD indikatörleri eklenir
4. Önemli seviyeler için alarm kurulur
5. Mobil bildirimler açılır

### Senaryo 2: Uzun Vadeli Yatırımcı
**Kullanıcı**: Haftalık/aylık pozisyon takibi

**İhtiyaçlar**:
- Uzun vadeli trend analizi
- Önemli seviyelere yaklaşma bildirimi
- Watchlist ile favori coin takibi

**Çözüm**:
1. 1 günlük (1d) zaman dilimi seçilir
2. EMA 50, 100, 200 eklenir
3. Watchlist'e yatırım yapılan coin'ler eklenir
4. Otomatik fiyat uyarıları açılır
5. Mobil uygulamada bildirimler aktif

### Senaryo 3: Mobil Kullanıcı
**Kullanıcı**: Yolda, işte, her yerde takip etmek istiyor

**İhtiyaçlar**:
- Mobil uygulama ile erişim
- Push notification ile anında bildirim
- Hızlı alarm kurma

**Çözüm**:
1. Mobil uygulama indirilir
2. Hesap oluşturulur/giriş yapılır
3. Favori coin'ler watchlist'e eklenir
4. Önemli seviyeler için alarm kurulur
5. Uygulama kapatılsa bile bildirimler gelir

### Senaryo 4: Profesyonel Analist
**Kullanıcı**: Detaylı teknik analiz yapıyor

**İhtiyaçlar**:
- Çoklu indikatör kombinasyonları
- Çizim araçları (Fibonacci, trend lines)
- Çoklu grafik düzeni
- Geçmiş veri analizi

**Çözüm**:
1. 3x3 grafik düzeni açılır
2. Her grafikte farklı coin ve zaman dilimi
3. Bollinger Bands, RSI, MACD kombinasyonu
4. Fibonacci retracement çizilir
5. Trend lines ile destek/direnç seviyeleri işaretlenir

---

## 🔒 Güvenlik ve Gizlilik

### Güvenlik Özellikleri

#### Authentication
- JWT token tabanlı kimlik doğrulama
- Refresh token ile uzun süreli oturum
- Şifre hash'leme (bcrypt, salt rounds: 10)
- Secure token storage (mobile: expo-secure-store)

#### Data Protection
- HTTPS iletişim (TLS 1.2+)
- CORS koruması
- SQL injection önleme (parametreli sorgular)
- XSS koruması (React'in built-in koruması)

#### Privacy
- Kullanıcı verileri şifrelenmiş saklanır
- Push token'lar güvenli şekilde yönetilir
- Cihaz bilgileri anonimleştirilir
- GDPR uyumlu (gelecek)

### Gizlilik Politikası

- **Veri Toplama**: Sadece gerekli veriler toplanır
- **Veri Kullanımı**: Sadece servis sağlamak için kullanılır
- **Veri Paylaşımı**: Üçüncü taraflarla paylaşılmaz
- **Veri Saklama**: Hesap silindiğinde tüm veriler silinir

---

## ⚡ Performans Özellikleri

### Web Performansı

#### Optimizasyonlar
- **Code Splitting**: Sayfa bazlı kod bölme
- **Lazy Loading**: Gerektiğinde yükleme
- **Web Workers**: Ağır işlemler ayrı thread'de
- **Chunk-based Caching**: Verimli bellek kullanımı
- **CDN**: Statik dosyalar CDN'den

#### Metrikler
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

### Backend Performansı

#### Optimizasyonlar
- **Database Indexing**: Hızlı sorgular
- **Connection Pooling**: Veritabanı bağlantı yönetimi
- **Caching**: Ticker verileri 15 saniye cache
- **Rate Limiting**: API abuse önleme

#### Metrikler
- **API Response Time**: < 200ms (ortalama)
- **WebSocket Latency**: < 100ms
- **Database Query Time**: < 50ms (ortalama)

### Mobile Performansı

#### Optimizasyonlar
- **Native Rendering**: WebView optimizasyonu
- **Offline Support**: Son verileri saklama
- **Background Sync**: Arka planda veri güncelleme
- **Push Notification**: Anında bildirim

#### Metrikler
- **App Launch Time**: < 2s
- **WebView Load Time**: < 3s
- **Push Notification Delivery**: < 5s

---

## 📊 Desteklenen Coin'ler

### Major Coins
- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- BNB (BNB)
- Cardano (ADA)
- Polygon (MATIC)
- Avalanche (AVAX)
- Chainlink (LINK)
- Uniswap (UNI)
- Ve 400+ coin daha...

### Market Types
- **Spot**: Anlık işlem çiftleri
- **Futures**: Vadeli işlem çiftleri

---

## 🚀 Gelecek Özellikler

### Planlanan Özellikler
- [ ] **Portfolio Tracking**: Yatırım portföyü takibi
- [ ] **Social Trading**: Diğer trader'ları takip etme
- [ ] **Trading Signals**: Otomatik sinyal üretimi
- [ ] **Backtesting**: Strateji test etme
- [ ] **Custom Indicators**: Özel indikatör oluşturma
- [ ] **Paper Trading**: Sanal işlem yapma
- [ ] **E-posta Bildirimleri**: E-posta ile bildirim
- [ ] **Telegram Bot**: Telegram entegrasyonu
- [ ] **Dark/Light Theme**: Tema seçenekleri
- [ ] **Multi-language**: Çoklu dil desteği

---

## 📞 Destek ve İletişim

### Destek Kanalları
- **E-posta**: duslerbiter@gmail.com
- **GitHub Issues**: https://github.com/atabey35/alertachart/issues
- **Web**: https://alerta.kriptokirmizi.com

### Dokümantasyon
- **GitHub Repository**: https://github.com/atabey35/alertachart
- **Backend Repository**: https://github.com/atabey35/alertachart-backend
- **Setup Guide**: `SETUP_GUIDE.md`
- **API Documentation**: `PUSH_NOTIFICATIONS.md`

---

## 📄 Lisans

MIT License - Detaylar için `LICENSE` dosyasına bakın.

---

## 🙏 Teşekkürler

- **aggr.trade**: Mimari ilham kaynağı
- **TradingView**: UI/UX ilham kaynağı
- **lightweight-charts**: Grafik kütüphanesi
- **Expo**: Mobil geliştirme framework'ü
- **Next.js**: Web framework'ü

---

**Son Güncelleme**: 6 Kasım 2025  
**Versiyon**: 1.2.1  
**Dokümantasyon Versiyonu**: 1.0

---

*Bu dokümantasyon, Alerta Chart platformunun teknik özelliklerini, hizmetlerini ve kullanım senaryolarını kapsamlı bir şekilde açıklamaktadır. Güncel bilgiler için GitHub repository'sini ziyaret edin.*

