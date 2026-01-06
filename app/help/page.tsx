'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Book, MessageCircle, Mail, ChevronRight, Search, ArrowLeft, X, TrendingUp, Bell, Star, Smartphone, HelpCircle } from 'lucide-react';
import SupportRequestModal from '@/components/SupportRequestModal';
import { t, Language } from '@/utils/translations';
import { App } from '@capacitor/app';
import MobileNav from '@/components/MobileNav';

interface FAQItem {
  questionKey: string;
  answerKey: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Chart
  {
    questionKey: 'faq_chart_alert_setup_question',
    answerKey: 'faq_chart_alert_setup_answer',
    category: 'Chart'
  },
  {
    questionKey: 'faq_chart_drawing_tools_question',
    answerKey: 'faq_chart_drawing_tools_answer',
    category: 'Chart'
  },
  {
    questionKey: 'faq_chart_multi_layout_question',
    answerKey: 'faq_chart_multi_layout_answer',
    category: 'Chart'
  },
  {
    questionKey: 'faq_chart_indicators_question',
    answerKey: 'faq_chart_indicators_answer',
    category: 'Chart'
  },
  // Trading
  {
    questionKey: 'faq_trading_spot_futures_question',
    answerKey: 'faq_trading_spot_futures_answer',
    category: 'Trading'
  },
  {
    questionKey: 'faq_trading_watchlist_question',
    answerKey: 'faq_trading_watchlist_answer',
    category: 'Trading'
  },
  {
    questionKey: 'faq_trading_realtime_question',
    answerKey: 'faq_trading_realtime_answer',
    category: 'Trading'
  },
  // Alerts
  {
    questionKey: 'faq_alerts_notification_question',
    answerKey: 'faq_alerts_notification_answer',
    category: 'Alerts'
  },
  {
    questionKey: 'faq_alerts_limit_question',
    answerKey: 'faq_alerts_limit_answer',
    category: 'Alerts'
  },
  {
    questionKey: 'faq_alerts_automatic_question',
    answerKey: 'faq_alerts_automatic_answer',
    category: 'Alerts'
  },
  {
    questionKey: 'faq_alerts_history_question',
    answerKey: 'faq_alerts_history_answer',
    category: 'Alerts'
  },
  // Data
  {
    questionKey: 'faq_data_liquidation_question',
    answerKey: 'faq_data_liquidation_answer',
    category: 'Data'
  },
  {
    questionKey: 'faq_data_aggr_question',
    answerKey: 'faq_data_aggr_answer',
    category: 'Data'
  },
  {
    questionKey: 'faq_data_exchanges_question',
    answerKey: 'faq_data_exchanges_answer',
    category: 'Data'
  },
  // Billing
  {
    questionKey: 'faq_billing_premium_question',
    answerKey: 'faq_billing_premium_answer',
    category: 'Billing'
  },
  {
    questionKey: 'faq_billing_trial_question',
    answerKey: 'faq_billing_trial_answer',
    category: 'Billing'
  },
  {
    questionKey: 'faq_billing_cancel_question',
    answerKey: 'faq_billing_cancel_answer',
    category: 'Billing'
  },
  {
    questionKey: 'faq_billing_payment_question',
    answerKey: 'faq_billing_payment_answer',
    category: 'Billing'
  },
  // Genel
  {
    questionKey: 'faq_general_devices_question',
    answerKey: 'faq_general_devices_answer',
    category: 'Chart'
  },
  {
    questionKey: 'faq_general_save_question',
    answerKey: 'faq_general_save_answer',
    category: 'Chart'
  },
  {
    questionKey: 'faq_general_offline_question',
    answerKey: 'faq_general_offline_answer',
    category: 'Chart'
  },
];

const categories = [
  { id: 'all', nameKey: 'categoryAll' },
  { id: 'Chart', nameKey: 'categoryChart' },
  { id: 'Trading', nameKey: 'categoryTrading' },
  { id: 'Data', nameKey: 'categoryData' },
  { id: 'Alerts', nameKey: 'categoryAlerts' },
  { id: 'Billing', nameKey: 'categoryBilling' },
];

interface Article {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  icon: string;
  content: string;
  contentEn: string;
  readTime: number;
}

interface SupportRequest {
  id: number;
  topic: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

const knowledgeBaseArticles: Article[] = [
  {
    id: 'getting-started',
    title: 'Alerta Chart\'a Başlarken: İlk Adımlar Rehberi',
    titleEn: 'Getting Started with Alerta Chart: First Steps Guide',
    category: 'Başlangıç',
    icon: 'TrendingUp',
    readTime: 5,
    content: `Alerta Chart'a hoş geldiniz! Bu rehber, platformu en verimli şekilde kullanmanız için size yol gösterecek.

**Hesap Oluşturma**
İlk olarak, Google veya Apple hesabınızla giriş yaparak ücretsiz hesabınızı oluşturun. Kayıt olduktan sonra 3 günlük premium deneme süresi kazanırsınız.

**İlk Grafiğinizi Açma**
Ana sayfada arama çubuğunu kullanarak istediğiniz kripto para birimini arayın. Örneğin "BTC" yazarak Bitcoin grafiğini açabilirsiniz. Grafik otomatik olarak gerçek zamanlı fiyat verileriyle güncellenir.

**Temel Navigasyon**
- Üst menüden Spot veya Futures piyasasını seçebilirsiniz
- Zaman dilimini (1m, 5m, 1h, 1d vb.) değiştirebilirsiniz
- Sağ taraftaki Watchlist panelinden favori coinlerinizi takip edebilirsiniz

**İlk Alarmınızı Kurma**
Grafik üzerinde istediğiniz fiyat seviyesine sağ tıklayın ve "Set Alert" seçeneğini seçin. Veya sağdaki Alerts panelinden "+" butonuna tıklayarak yeni alarm ekleyebilirsiniz.

**Mobil Uygulama**
iOS ve Android uygulamalarımızı indirerek tüm özelliklere mobil cihazınızdan erişebilirsiniz. Mobil uygulamada push notification desteği ile alarmlarınızı kaçırmazsınız.`,
    contentEn: `Welcome to Alerta Chart! This guide will help you use the platform most efficiently.

**Creating an Account**
First, sign in with your Google or Apple account to create your free account. After registration, you'll get a 3-day premium trial period.

**Opening Your First Chart**
Use the search bar on the home page to search for the cryptocurrency you want. For example, type "BTC" to open the Bitcoin chart. The chart automatically updates with real-time price data.

**Basic Navigation**
- Select Spot or Futures market from the top menu
- Change the timeframe (1m, 5m, 1h, 1d, etc.)
- Track your favorite coins from the Watchlist panel on the right

**Setting Your First Alert**
Right-click on the desired price level on the chart and select "Set Alert". Or click the "+" button in the Alerts panel on the right to add a new alert.

**Mobile App**
Download our iOS and Android apps to access all features from your mobile device. With push notification support in the mobile app, you won't miss your alerts.`
  },
  {
    id: 'chart-basics',
    title: 'Grafik Okuma ve Analiz Temelleri',
    titleEn: 'Chart Reading and Analysis Basics',
    category: 'Grafik',
    icon: 'TrendingUp',
    readTime: 8,
    content: `Grafik okuma, kripto para yatırımlarında kritik bir beceridir. Bu makale, Alerta Chart'ta grafikleri nasıl okuyacağınızı ve analiz edeceğinizi öğretecek.

**Mum Grafikleri (Candlesticks)**
Her mum, belirli bir zaman dilimindeki fiyat hareketini gösterir:
- Yeşil mum: Fiyat yükseldi (açılış < kapanış)
- Kırmızı mum: Fiyat düştü (açılış > kapanış)
- Mumun gövdesi: Açılış ve kapanış fiyatları arasındaki farkı gösterir
- Fitiller: O zaman dilimindeki en yüksek ve en düşük fiyatları gösterir

**Zaman Dilimleri (Timeframes)**
Farklı zaman dilimleri farklı analizler için kullanılır:
- 1m, 5m, 15m: Kısa vadeli işlemler ve scalping
- 1h, 4h: Orta vadeli trend analizi
- 1d, 1w: Uzun vadeli yatırım kararları

**Hacim (Volume)**
Grafiğin altındaki hacim çubukları, o zaman diliminde ne kadar işlem yapıldığını gösterir. Yüksek hacim, fiyat hareketinin güçlü olduğunu işaret eder.

**Çizim Araçları**
- Trend Çizgisi: Fiyat trendini belirlemek için
- Yatay Çizgi: Destek ve direnç seviyelerini işaretlemek için
- Fibonacci: Geri çekilme seviyelerini hesaplamak için

**Grafik Ayarları**
Grafik üzerindeki ayarlar butonuna tıklayarak renkleri, grid'i, göstergeleri özelleştirebilirsiniz.`,
    contentEn: `Chart reading is a critical skill in cryptocurrency investing. This article will teach you how to read and analyze charts on Alerta Chart.

**Candlesticks**
Each candle shows price movement in a specific time period:
- Green candle: Price rose (opening < closing)
- Red candle: Price fell (opening > closing)
- Candle body: Shows the difference between opening and closing prices
- Wicks: Show the highest and lowest prices in that time period

**Timeframes**
Different timeframes are used for different analyses:
- 1m, 5m, 15m: Short-term trading and scalping
- 1h, 4h: Medium-term trend analysis
- 1d, 1w: Long-term investment decisions

**Volume**
The volume bars below the chart show how much trading occurred in that time period. High volume indicates strong price movement.

**Drawing Tools**
- Trend Line: To determine price trends
- Horizontal Line: To mark support and resistance levels
- Fibonacci: To calculate retracement levels

**Chart Settings**
Click the settings button on the chart to customize colors, grid, and indicators.`
  },
  {
    id: 'alerts-master',
    title: 'Alarm Sistemi: Hiçbir Fırsatı Kaçırmayın',
    titleEn: 'Alert System: Never Miss an Opportunity',
    category: 'Alarmlar',
    icon: 'Bell',
    readTime: 6,
    content: `Alerta Chart'ın güçlü alarm sistemi, hedef fiyatlarınıza ulaşıldığında sizi anında bilgilendirir. Bu makale, alarm sistemini en iyi şekilde kullanmanızı sağlayacak.

**Alarm Kurma Yöntemleri**
1. Grafik Üzerinden: İstediğiniz fiyat seviyesine sağ tıklayın ve "Set Alert" seçin
2. Alerts Panelinden: Sağdaki Alerts panelinde "+" butonuna tıklayın
3. Hızlı Kurulum: Fiyat seviyesini manuel olarak girerek hızlıca alarm kurabilirsiniz

**Alarm Türleri**
- Fiyat Alarmı: Belirli bir fiyat seviyesine ulaşıldığında bildirim alın
- Yukarı Yönlü: Fiyat yukarı çıktığında
- Aşağı Yönlü: Fiyat aşağı düştüğünde

**Premium Alarm Özellikleri**
Premium üyeler için:
- Sınırsız alarm kurma hakkı
- 7/24 otomatik fiyat takibi (uygulama kapalı olsa bile)
- Push notification desteği
- Alarm geçmişi ve istatistikleri

**Free Plan Limitleri**
Ücretsiz plan kullanıcıları:
- Maksimum 5 aktif alarm
- Uygulama açıkken bildirim
- Temel alarm özellikleri

**Alarm Yönetimi**
Alerts panelinden tüm alarmlarınızı görüntüleyebilir, düzenleyebilir veya silebilirsiniz. Tetiklenen alarmlar otomatik olarak geçmişe taşınır.

**Bildirim Ayarları**
Mobil uygulamada bildirim izinlerini açarak push notification'ları alabilirsiniz. iOS ve Android cihazlarda ayarlardan bildirim izinlerini yönetebilirsiniz.`,
    contentEn: `Alerta Chart's powerful alert system instantly notifies you when your target prices are reached. This article will help you use the alert system to its fullest.

**Ways to Set Alerts**
1. From Chart: Right-click on the desired price level and select "Set Alert"
2. From Alerts Panel: Click the "+" button in the Alerts panel on the right
3. Quick Setup: Quickly set alerts by manually entering the price level

**Alert Types**
- Price Alert: Get notified when a specific price level is reached
- Upward: When price goes up
- Downward: When price goes down

**Premium Alert Features**
For premium members:
- Unlimited alert creation
- 24/7 automatic price tracking (even when app is closed)
- Push notification support
- Alert history and statistics

**Free Plan Limits**
Free plan users:
- Maximum 5 active alerts
- Notifications when app is open
- Basic alert features

**Alert Management**
View, edit, or delete all your alerts from the Alerts panel. Triggered alerts are automatically moved to history.

**Notification Settings**
You can receive push notifications by enabling notification permissions in the mobile app. Manage notification permissions from settings on iOS and Android devices.`
  },
  {
    id: 'premium-benefits',
    title: 'Premium Üyelik: Tüm Avantajlar',
    titleEn: 'Premium Membership: All Benefits',
    category: 'Premium',
    icon: 'Star',
    readTime: 7,
    content: `Premium üyelik, Alerta Chart'ın tüm güçlü özelliklerine erişmenizi sağlar. Bu makale, premium üyeliğin size sağladığı tüm avantajları detaylıca açıklıyor.

**Sınırsız Alarm**
Free plan'da 5 alarm limiti varken, premium üyeler sınırsız sayıda alarm kurabilir. Tüm portföyünüzü takip edin, hiçbir fırsatı kaçırmayın.

**7/24 Otomatik Fiyat Takibi**
Premium üyeler için backend sunucumuz 7/24 çalışarak fiyatları takip eder. Uygulama kapalı olsa bile, alarmlarınız tetiklendiğinde push notification alırsınız. Bu özellik, özellikle gece saatlerinde veya uygulamayı açık tutamadığınız durumlarda çok değerlidir.

**Liquidations Dashboard**
Futures piyasasındaki liquidation verilerini gerçek zamanlı olarak görüntüleyin. Hangi fiyat seviyelerinde büyük pozisyonların kapandığını takip edin ve bu bilgiyi işlem stratejinizde kullanın.

**AGGR (Aggregate Trades) Menüsü**
Farklı borsalardan toplanan işlem verilerini bir arada görüntüleyin. Bu gelişmiş analiz aracı, piyasa hareketlerini daha iyi anlamanıza yardımcı olur.

**Tüm Zaman Dilimlerine Erişim**
Free plan'da sınırlı zaman dilimleri varken, premium üyeler tüm zaman dilimlerine (1m'den 1w'ye kadar) erişebilir.

**Reklamsız Deneyim**
Premium üyelik ile reklamsız, kesintisiz bir grafik deneyimi yaşayın.

**Ücretsiz Deneme**
Yeni kayıt olan tüm kullanıcılar 3 günlük ücretsiz premium deneme süresi kazanır. Bu süre içinde tüm premium özellikleri deneyebilirsiniz.

**Abonelik Yönetimi**
iOS: App Store > Abonelikler menüsünden
Android: Google Play > Abonelikler menüsünden
Aboneliğinizi kolayca yönetebilir, iptal edebilir veya yenileyebilirsiniz.`,
    contentEn: `Premium membership gives you access to all of Alerta Chart's powerful features. This article explains all the benefits that premium membership provides in detail.

**Unlimited Alerts**
While the free plan has a 5 alert limit, premium members can set unlimited alerts. Track your entire portfolio, never miss an opportunity.

**24/7 Automatic Price Tracking**
For premium members, our backend server works 24/7 to track prices. Even when the app is closed, you'll receive push notifications when your alerts trigger. This feature is especially valuable during night hours or when you can't keep the app open.

**Liquidations Dashboard**
View liquidation data from the futures market in real-time. Track which price levels see large position closures and use this information in your trading strategy.

**AGGR (Aggregate Trades) Menu**
View aggregated trade data from different exchanges together. This advanced analysis tool helps you better understand market movements.

**Access to All Timeframes**
While the free plan has limited timeframes, premium members can access all timeframes (from 1m to 1w).

**Ad-Free Experience**
Enjoy an ad-free, uninterrupted chart experience with premium membership.

**Free Trial**
All newly registered users get a 3-day free premium trial period. You can try all premium features during this time.

**Subscription Management**
iOS: From App Store > Subscriptions menu
Android: From Google Play > Subscriptions menu
You can easily manage, cancel, or renew your subscription.`
  },
  {
    id: 'mobile-app',
    title: 'Mobil Uygulama Kullanım Rehberi',
    titleEn: 'Mobile App Usage Guide',
    category: 'Mobil',
    icon: 'Smartphone',
    readTime: 6,
    content: `Alerta Chart mobil uygulaması, tüm özelliklere iOS ve Android cihazlarınızdan erişmenizi sağlar. Bu rehber, mobil uygulamayı en iyi şekilde kullanmanız için ipuçları içerir.

**Uygulamayı İndirme**
- iOS: App Store'dan "Alerta Chart" arayarak indirin
- Android: Google Play Store'dan "Alerta Chart" arayarak indirin

**İlk Giriş**
Uygulamayı ilk açtığınızda, web'deki gibi Google veya Apple hesabınızla giriş yapabilirsiniz. Oturumunuz otomatik olarak kaydedilir ve bir sonraki açılışta tekrar giriş yapmanız gerekmez.

**Push Notification Kurulumu**
Alarm bildirimlerini almak için:
1. Uygulama açıldığında bildirim izni isteği çıkar
2. "İzin Ver" seçeneğini seçin
3. iOS: Ayarlar > Bildirimler > Alerta Chart
4. Android: Ayarlar > Uygulamalar > Alerta Chart > Bildirimler

**Mobil Grafik Kullanımı**
- Pinch-to-zoom: İki parmağınızla yakınlaştırma/uzaklaştırma
- Kaydırma: Grafiği yatay ve dikey kaydırma
- Çizim araçları: Sağ alttaki mavi butona basarak erişin
- Zaman dilimi: Üst menüden seçin

**Mobil Alarm Kurma**
1. Grafik üzerinde istediğiniz fiyat seviyesine uzun basın
2. Açılan menüden "Set Alert" seçin
3. Veya sağdaki Alerts panelinden "+" butonuna tıklayın

**Offline Kullanım**
Uygulama internet bağlantısı gerektirir çünkü gerçek zamanlı veriler kullanır. Ancak önceden yüklenmiş grafikler offline görüntülenebilir.

**Performans İpuçları**
- Düşük internet bağlantısında daha yüksek zaman dilimleri (1h, 4h) kullanın
- Gereksiz alarmları silerek performansı artırın
- Uygulamayı düzenli olarak güncelleyin`,
    contentEn: `The Alerta Chart mobile app lets you access all features from your iOS and Android devices. This guide contains tips for using the mobile app to its fullest.

**Downloading the App**
- iOS: Search for "Alerta Chart" in the App Store
- Android: Search for "Alerta Chart" in Google Play Store

**First Login**
When you first open the app, you can sign in with your Google or Apple account, just like on the web. Your session is automatically saved, so you won't need to sign in again on the next launch.

**Push Notification Setup**
To receive alert notifications:
1. When the app opens, a notification permission request appears
2. Select "Allow"
3. iOS: Settings > Notifications > Alerta Chart
4. Android: Settings > Apps > Alerta Chart > Notifications

**Mobile Chart Usage**
- Pinch-to-zoom: Zoom in/out with two fingers
- Scrolling: Scroll the chart horizontally and vertically
- Drawing tools: Access via the blue button in the bottom right
- Timeframe: Select from the top menu

**Setting Mobile Alerts**
1. Long-press on the desired price level on the chart
2. Select "Set Alert" from the menu that appears
3. Or click the "+" button in the Alerts panel on the right

**Offline Usage**
The app requires an internet connection as it uses real-time data. However, previously loaded charts can be viewed offline.

**Performance Tips**
- Use higher timeframes (1h, 4h) on low internet connections
- Improve performance by deleting unnecessary alerts
- Update the app regularly`
  },
  {
    id: 'troubleshooting',
    title: 'Sık Karşılaşılan Sorunlar ve Çözümleri',
    titleEn: 'Common Issues and Solutions',
    category: 'Sorun Giderme',
    icon: 'HelpCircle',
    readTime: 5,
    content: `Bu makale, Alerta Chart kullanırken karşılaşabileceğiniz yaygın sorunları ve çözümlerini içerir.

**Grafik Yüklenmiyor**
- İnternet bağlantınızı kontrol edin
- Sayfayı yenileyin (F5 veya Cmd+R)
- Tarayıcı önbelleğini temizleyin
- Farklı bir tarayıcı deneyin

**Fiyat Verileri Güncellenmiyor**
- WebSocket bağlantısını kontrol edin (grafik üzerindeki yeşil/kırmızı nokta)
- Sayfayı yenileyin
- İnternet bağlantınızın stabil olduğundan emin olun

**Alarm Bildirimleri Gelmiyor (Premium)**
- Mobil uygulamada bildirim izinlerinin açık olduğunu kontrol edin
- iOS: Ayarlar > Bildirimler > Alerta Chart
- Android: Ayarlar > Uygulamalar > Alerta Chart > Bildirimler
- Uygulamayı kapatıp tekrar açın
- Cihazınızın "Sessize Alınmış" modunda olmadığından emin olun

**Giriş Yapamıyorum**
- Google/Apple hesabınızın doğru olduğundan emin olun
- Tarayıcı çerezlerini kontrol edin
- Gizli/incognito modda deneyin
- Farklı bir tarayıcı veya cihaz deneyin

**Mobil Uygulama Çöküyor**
- Uygulamayı en son sürüme güncelleyin
- Cihazınızı yeniden başlatın
- Uygulamayı silip tekrar yükleyin (verileriniz kaybolmaz, sunucuda saklanır)

**Çizimlerim Kayboldu**
- Çizimler cihazınızda (localStorage) saklanır
- Farklı bir cihaz veya tarayıcı kullanıyorsanız çizimler görünmez
- Tarayıcı verilerini temizlediyseniz çizimler silinmiş olabilir

**Premium Özellikler Çalışmıyor**
- Premium aboneliğinizin aktif olduğundan emin olun
- Çıkış yapıp tekrar giriş yapın
- Abonelik durumunuzu kontrol edin (Ayarlar > Plan)

Hala sorun yaşıyorsanız, destek talebi göndererek ekibimizle iletişime geçebilirsiniz.`,
    contentEn: `This article covers common issues you may encounter while using Alerta Chart and their solutions.

**Chart Not Loading**
- Check your internet connection
- Refresh the page (F5 or Cmd+R)
- Clear browser cache
- Try a different browser

**Price Data Not Updating**
- Check WebSocket connection (green/red dot on chart)
- Refresh the page
- Make sure your internet connection is stable

**Alert Notifications Not Coming (Premium)**
- Check that notification permissions are enabled in the mobile app
- iOS: Settings > Notifications > Alerta Chart
- Android: Settings > Apps > Alerta Chart > Notifications
- Close and reopen the app
- Make sure your device is not in "Do Not Disturb" mode

**Can't Sign In**
- Make sure your Google/Apple account is correct
- Check browser cookies
- Try in private/incognito mode
- Try a different browser or device

**Mobile App Crashing**
- Update the app to the latest version
- Restart your device
- Delete and reinstall the app (your data won't be lost, it's stored on the server)

**My Drawings Disappeared**
- Drawings are stored on your device (localStorage)
- Drawings won't appear if you're using a different device or browser
- Drawings may have been deleted if you cleared browser data

**Premium Features Not Working**
- Make sure your premium subscription is active
- Sign out and sign in again
- Check your subscription status (Settings > Plan)

If you're still experiencing issues, you can contact our team by submitting a support request.`
  },
  {
    id: 'trading-tips',
    title: 'Trading İpuçları ve Stratejiler',
    titleEn: 'Trading Tips and Strategies',
    category: 'Trading',
    icon: 'TrendingUp',
    readTime: 10,
    content: `Alerta Chart'ı kullanarak daha iyi trading kararları vermenize yardımcı olacak pratik ipuçları ve stratejiler.

**Destek ve Direnç Seviyeleri**
Grafik üzerinde yatay çizgiler kullanarak önemli destek ve direnç seviyelerini işaretleyin. Bu seviyeler, fiyatın muhtemelen tepki vereceği noktalardır. Trend çizgileri ile de trend yönünü belirleyebilirsiniz.

**Hacim Analizi**
Yüksek hacimli fiyat hareketleri daha güvenilirdir. Grafiğin altındaki hacim çubuklarını takip edin. Fiyat yükselirken hacim de artıyorsa, bu güçlü bir yükseliş sinyalidir.

**Zaman Dilimi Seçimi**
- Scalping için: 1m, 5m
- Günlük trading için: 15m, 1h
- Swing trading için: 4h, 1d
- Uzun vadeli yatırım için: 1d, 1w

**Alarm Stratejisi**
Önemli destek/direnç seviyelerine alarm kurun. Fiyat bu seviyelere yaklaştığında bildirim alarak hızlıca karar verebilirsiniz. Premium üyelik ile sınırsız alarm kurarak tüm önemli seviyeleri takip edin.

**Multi-Chart Kullanımı**
Farklı coinleri veya aynı coinin farklı zaman dilimlerini yan yana görüntüleyerek daha kapsamlı analiz yapın. 2x2 veya 3x3 grid kullanarak birden fazla piyasayı aynı anda takip edin.

**Göstergeler (Indicators)**
- RSI: Aşırı alım/satım seviyelerini belirlemek için
- MACD: Trend değişimlerini yakalamak için
- EMA/SMA: Trend yönünü belirlemek için
- Bollinger Bands: Volatilite analizi için

**Risk Yönetimi**
Asla tüm sermayenizi tek bir işlemde kullanmayın. Stop-loss seviyelerini belirleyin ve alarmlarınızı bu seviyelere kurun. Alerta Chart'ın alarm sistemi, risk yönetimi stratejinizin önemli bir parçası olabilir.

**Liquidations Dashboard (Premium)**
Futures piyasasındaki liquidation verilerini takip ederek, hangi fiyat seviyelerinde büyük pozisyonların kapandığını görün. Bu bilgi, potansiyel destek/direnç seviyelerini belirlemenize yardımcı olabilir.`,
    contentEn: `Practical tips and strategies to help you make better trading decisions using Alerta Chart.

**Support and Resistance Levels**
Use horizontal lines on the chart to mark important support and resistance levels. These are points where price is likely to react. You can also determine trend direction with trend lines.

**Volume Analysis**
High-volume price movements are more reliable. Track the volume bars below the chart. If volume increases as price rises, this is a strong bullish signal.

**Timeframe Selection**
- For scalping: 1m, 5m
- For daily trading: 15m, 1h
- For swing trading: 4h, 1d
- For long-term investment: 1d, 1w

**Alert Strategy**
Set alerts at important support/resistance levels. When price approaches these levels, you'll be notified and can make quick decisions. With premium membership, set unlimited alerts to track all important levels.

**Multi-Chart Usage**
View different coins or different timeframes of the same coin side by side for more comprehensive analysis. Use 2x2 or 3x3 grid to track multiple markets simultaneously.

**Indicators**
- RSI: To determine overbought/oversold levels
- MACD: To catch trend changes
- EMA/SMA: To determine trend direction
- Bollinger Bands: For volatility analysis

**Risk Management**
Never use all your capital in a single trade. Set stop-loss levels and set your alerts at these levels. Alerta Chart's alert system can be an important part of your risk management strategy.

**Liquidations Dashboard (Premium)**
Track liquidation data from the futures market to see which price levels see large position closures. This information can help you identify potential support/resistance levels.`
  }
];

const articleCategories = [
  { id: 'all', name: 'Tümü', nameEn: 'All', icon: 'Book' },
  { id: 'Başlangıç', name: 'Başlangıç', nameEn: 'Getting Started', icon: 'TrendingUp' },
  { id: 'Grafik', name: 'Grafik', nameEn: 'Chart', icon: 'TrendingUp' },
  { id: 'Alarmlar', name: 'Alarmlar', nameEn: 'Alerts', icon: 'Bell' },
  { id: 'Premium', name: 'Premium', nameEn: 'Premium', icon: 'Star' },
  { id: 'Mobil', name: 'Mobil', nameEn: 'Mobile', icon: 'Smartphone' },
  { id: 'Sorun Giderme', name: 'Sorun Giderme', nameEn: 'Troubleshooting', icon: 'HelpCircle' },
  { id: 'Trading', name: 'Trading', nameEn: 'Trading', icon: 'TrendingUp' },
];

export default function HelpCenter() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [language, setLanguage] = useState<Language>('tr');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleCategory, setArticleCategory] = useState('all');
  const [myRequests, setMyRequests] = useState<SupportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<number | null>(null);

  // Fetch user's support requests
  useEffect(() => {
    const fetchMyRequests = async () => {
      setLoadingRequests(true);
      try {
        const response = await fetch('/api/my-support-requests');
        const data = await response.json();

        // Only set requests if user is authenticated
        if (response.ok && data.success) {
          setMyRequests(data.requests || []);
        } else if (response.status === 401) {
          // User not authenticated - silently handle, don't show error
          setMyRequests([]);
        }
      } catch (error) {
        // Silently handle errors - user might not be logged in
        setMyRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchMyRequests();
  }, []);

  // Check if running in Capacitor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCapacitor = !!(window as any).Capacitor;
      setIsCapacitor(hasCapacitor);
    }
  }, []);

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language | null;
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }
  }, []);

  // Controlled back navigation - handles modals and missing history
  const handleGoBack = useCallback(() => {
    // First check if any modal is open
    if (selectedArticle) {
      setSelectedArticle(null);
      return true; // Handled
    }
    if (showKnowledgeBase) {
      setShowKnowledgeBase(false);
      return true; // Handled
    }
    if (showSupportModal) {
      setShowSupportModal(false);
      return true; // Handled
    }

    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // No history, go to home page
      router.push('/');
    }
    return true;
  }, [selectedArticle, showKnowledgeBase, showSupportModal, router]);

  // Handle Android hardware back button (Capacitor)
  useEffect(() => {
    if (!isCapacitor) return;

    const backButtonListener = App.addListener('backButton', () => {
      handleGoBack();
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [isCapacitor, handleGoBack]);

  // Handle mail link - works for both web and Capacitor
  const handleMailLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mailtoUrl = (e.currentTarget as HTMLAnchorElement).href;

    // Try window.open() first (works on mobile with _system target)
    // If that fails, fallback to location.href
    try {
      const opened = window.open(mailtoUrl, '_system');
      // Check if window.open was blocked or failed
      if (!opened || opened.closed || typeof opened.closed === 'undefined') {
        // Fallback to location.href
        window.location.href = mailtoUrl;
      }
    } catch (error) {
      // If window.open throws an error, use location.href
      console.error('[Help] Error opening mail:', error);
      window.location.href = mailtoUrl;
    }
  };

  // Arama ve kategori filtreleme
  const filteredFAQs = faqs.filter(faq => {
    const question = t(faq.questionKey, language);
    const answer = t(faq.answerKey, language);
    const matchesSearch = question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Makale filtreleme
  const filteredArticles = knowledgeBaseArticles.filter(article => {
    const title = language === 'tr' ? article.title : article.titleEn;
    const content = language === 'tr' ? article.content : article.contentEn;
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = articleCategory === 'all' || article.category === articleCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      TrendingUp,
      Bell,
      Star,
      Smartphone,
      HelpCircle,
      Book,
    };
    const IconComponent = icons[iconName] || Book;
    return <IconComponent className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-12">
          {/* Back Button */}


          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
            {t('helpCenter', language)}
          </h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder={t('findYourAnswer', language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Popular Categories */}
          <div className="mt-6">
            <p className="text-center text-gray-400 mb-4">
              {t('popularCategories', language)}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg border transition-all ${selectedCategory === cat.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                >
                  {t(cat.nameKey, language)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Main Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Knowledge Base - FAQ */}
          <button
            onClick={() => setShowKnowledgeBase(true)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all cursor-pointer group text-left w-full"
          >
            <div className="bg-blue-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Book className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('knowledgeBase', language)}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr'
                ? t('knowledgeBaseDesc', language)
                : t('knowledgeBaseDesc', language)}
            </p>
          </button>

          {/* Chat Assistant - FAQ Section */}
          <a
            href="#faq"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group"
          >
            <div className="bg-purple-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('faq', language)}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr'
                ? t('faqDesc', language)
                : t('faqDesc', language)}
            </p>
          </a>

          {/* Support Requests */}
          <button
            onClick={() => setShowSupportModal(true)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group text-left w-full"
          >
            <div className="bg-green-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('supportRequestTitle', language)}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr'
                ? t('supportRequestDesc', language)
                : t('supportRequestDesc', language)}
            </p>
          </button>
        </div>

        {/* My Open Requests Section */}
        {myRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Mail className="w-8 h-8 text-green-400" />
              {t('myOpenRequests', language)}
            </h2>

            {loadingRequests ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{t('loadingRequests', language)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => {
                  const isExpanded = expandedRequest === request.id;
                  const statusColors = {
                    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                    in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                    resolved: 'text-green-400 bg-green-500/10 border-green-500/20',
                  };
                  const statusKey = request.status === 'in_progress' ? 'inProgress' : request.status;

                  return (
                    <div
                      key={request.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all"
                    >
                      {/* Request Header */}
                      <button
                        onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                        className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-900/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-800 text-gray-300">
                              {request.topic}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[request.status as keyof typeof statusColors] || statusColors.pending}`}>
                              {t(statusKey, language)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-1">
                            {request.message}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-5 pt-0 space-y-4 border-t border-gray-800">
                          {/* Full Message */}
                          <div>
                            <div className="text-xs font-semibold text-gray-400 mb-2">
                              {language === 'tr' ? 'Mesajınız:' : 'Your Message:'}
                            </div>
                            <p className="text-sm text-white whitespace-pre-wrap bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                              {request.message}
                            </p>
                          </div>

                          {/* Admin Reply */}
                          {request.admin_reply ? (
                            <div>
                              <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                {t('adminReply', language)}
                              </div>
                              <p className="text-sm text-white whitespace-pre-wrap bg-green-500/5 p-4 rounded-lg border border-green-500/20">
                                {request.admin_reply}
                              </p>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic flex items-center gap-2 bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                              <MessageCircle className="w-4 h-4" />
                              {t('noReplyYet', language)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div id="faq" className="scroll-mt-24">
          <h2 className="text-3xl font-bold mb-8">
            {t('faq', language)}
          </h2>

          {filteredFAQs.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">
                {language === 'tr'
                  ? t('noResultsFound', language)
                  : t('noResultsFound', language)}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <details
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all group"
                >
                  <summary className="cursor-pointer flex items-center justify-between text-lg font-medium group-hover:text-blue-400 transition-colors">
                    <span>{t(faq.questionKey, language)}</span>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-800 text-gray-400 leading-relaxed">
                    {t(faq.answerKey, language)}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* More to Explore */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">
            {t('moreToExplore', language)}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="/"
              className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Book className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-lg font-medium">
                  {t('gettingStarted', language)}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </a>

            <button
              onClick={() => setShowSupportModal(true)}
              className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all group flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-lg font-medium">
                  {t('contactUs', language)}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

      </div>

      {/* Support Request Modal */}
      <SupportRequestModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        language={language}
      />

      {/* Knowledge Base Modal */}
      {showKnowledgeBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-gray-800/50 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  {t('knowledgeBase', language)}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {language === 'tr'
                    ? `${knowledgeBaseArticles.length} ${t('articles', language)}`
                    : `${knowledgeBaseArticles.length} ${t('articles', language)}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowKnowledgeBase(false);
                  setSelectedArticle(null);
                  setArticleCategory('all');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {selectedArticle ? (
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('back', language)}</span>
                </button>
                <div className="prose prose-invert max-w-none">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {language === 'tr' ? selectedArticle.title : selectedArticle.titleEn}
                  </h1>
                  <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
                    <span>{selectedArticle.readTime} {t('minRead', language)}</span>
                    <span>•</span>
                    <span>{language === 'tr' ? selectedArticle.category : articleCategories.find(c => c.id === selectedArticle.category)?.nameEn}</span>
                  </div>
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {language === 'tr' ? selectedArticle.content : selectedArticle.contentEn}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t('searchArticles', language)}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {articleCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setArticleCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${articleCategory === cat.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                    >
                      {getIcon(cat.icon)}
                      <span>{language === 'tr' ? cat.name : cat.nameEn}</span>
                    </button>
                  ))}
                </div>

                {/* Articles List */}
                {filteredArticles.length === 0 ? (
                  <div className="text-center py-16">
                    <Book className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {language === 'tr'
                        ? t('noArticlesFound', language)
                        : t('noArticlesFound', language)}
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredArticles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article)}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all text-left group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            {getIcon(article.icon)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                              {language === 'tr' ? article.title : article.titleEn}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span>{article.readTime} {t('min', language)}</span>
                              <span>•</span>
                              <span>{language === 'tr' ? article.category : articleCategories.find(c => c.id === article.category)?.nameEn}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <MobileNav language={language} />
    </div>
  );
}

