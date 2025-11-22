'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, MessageCircle, Mail, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import SupportRequestModal from '@/components/SupportRequestModal';

interface FAQItem {
  question: string;
  answer: string;
  questionEn: string;
  answerEn: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Chart
  {
    question: 'Grafik üzerinde nasıl alarm kurabilirim?',
    answer: 'Grafik üzerinde istediğiniz fiyat seviyesine sağ tıklayın ve "Set Alert" seçeneğini seçin. Alternatif olarak, sağdaki Alerts panelinden de alarm kurabilirsiniz.',
    questionEn: 'How can I set an alert on the chart?',
    answerEn: 'Right-click on the desired price level on the chart and select "Set Alert". Alternatively, you can also set alerts from the Alerts panel on the right.',
    category: 'Chart'
  },
  {
    question: 'Çizim araçlarını nasıl kullanabilirim?',
    answer: 'Grafik altındaki araç çubuğundan çizim araçlarına erişebilirsiniz. Trend çizgisi, yatay çizgi, Fibonacci gibi birçok araç mevcuttur. Mobilde sağ alttaki mavi butona basarak araçlara ulaşabilirsiniz.',
    questionEn: 'How can I use the drawing tools?',
    answerEn: 'You can access drawing tools from the toolbar below the chart. Many tools are available such as trend lines, horizontal lines, Fibonacci, etc. On mobile, tap the blue button in the bottom right to access the tools.',
    category: 'Chart'
  },
  {
    question: 'Multi-chart layout nasıl kullanılır?',
    answer: 'Üst menüden 1x1, 1x2, 2x2 veya 3x3 grid düzenini seçebilirsiniz. Her bir grafikte farklı coin ve timeframe gösterebilirsiniz.',
    questionEn: 'How do I use the multi-chart layout?',
    answerEn: 'You can select 1x1, 1x2, 2x2, or 3x3 grid layout from the top menu. You can display different coins and timeframes on each chart.',
    category: 'Chart'
  },
  {
    question: 'Grafik göstergeleri (indicators) nasıl eklenir?',
    answer: 'Grafik üzerindeki ayarlar butonuna tıklayın. Indicators bölümünden RSI, MACD, EMA, SMA, Bollinger Bands gibi göstergeleri aktif edebilirsiniz.',
    questionEn: 'How do I add chart indicators?',
    answerEn: 'Click the settings button on the chart. You can activate indicators like RSI, MACD, EMA, SMA, Bollinger Bands from the Indicators section.',
    category: 'Chart'
  },
  // Trading
  {
    question: 'Spot ve Futures arasındaki fark nedir?',
    answer: 'Spot piyasada gerçek varlık alım satımı yapılırken, Futures\'da türev ürünler işlem görür. Üst menüden SPOT/FUTURES seçimi yapabilirsiniz.',
    questionEn: 'What is the difference between Spot and Futures?',
    answerEn: 'Spot market trades real assets, while Futures trades derivative products. You can select SPOT/FUTURES from the top menu.',
    category: 'Trading'
  },
  {
    question: 'Watchlist\'e nasıl coin eklerim?',
    answer: 'Watchlist panelindeki "+" butonuna tıklayın. Arama yaparak istediğiniz coin\'i bulun ve ekleyin. Ayrıca kategori filtreleri ile de coin bulabilirsiniz.',
    questionEn: 'How do I add coins to the watchlist?',
    answerEn: 'Click the "+" button in the watchlist panel. Search and find the coin you want and add it. You can also use category filters to find coins.',
    category: 'Trading'
  },
  {
    question: 'Gerçek zamanlı fiyat güncellemeleri nasıl çalışır?',
    answer: 'Binance WebSocket bağlantısı üzerinden gerçek zamanlı fiyat verileri alınır. Bağlantı durumunu grafik üzerindeki yeşil/kırmızı nokta ile görebilirsiniz.',
    questionEn: 'How do real-time price updates work?',
    answerEn: 'Real-time price data is received through Binance WebSocket connection. You can see the connection status with the green/red dot on the chart.',
    category: 'Trading'
  },
  // Alerts
  {
    question: 'Alarmlarım nasıl bildiriliyor?',
    answer: 'Premium üyeler için push notification (mobil bildirim) ve backend üzerinden otomatik takip. Free kullanıcılar için uygulama açık olduğunda bildirim.',
    questionEn: 'How are my alerts notified?',
    answerEn: 'For premium members: push notifications (mobile) and automatic tracking via backend. For free users: notifications when the app is open.',
    category: 'Alerts'
  },
  {
    question: 'Kaç tane alarm kurabilirim?',
    answer: 'Free plan: 5 alarm. Premium plan: Sınırsız alarm kurabilirsiniz.',
    questionEn: 'How many alerts can I set?',
    answerEn: 'Free plan: 5 alerts. Premium plan: Unlimited alerts.',
    category: 'Alerts'
  },
  {
    question: 'Alarmlarım otomatik takip ediliyor mu?',
    answer: 'Premium üyeler için evet! Backend sunucumuz 7/24 fiyatları takip eder ve alarm tetiklendiğinde push notification gönderir. Uygulama kapalı olsa bile bildirim alırsınız.',
    questionEn: 'Are my alerts automatically monitored?',
    answerEn: 'Yes for premium members! Our backend server monitors prices 24/7 and sends push notifications when alerts trigger. You receive notifications even when the app is closed.',
    category: 'Alerts'
  },
  {
    question: 'Alarm geçmişini görebilir miyim?',
    answer: 'Evet, Alerts panelinde geçmiş alarmlarınızı ve tetiklenme durumlarını görebilirsiniz.',
    questionEn: 'Can I see alert history?',
    answerEn: 'Yes, you can see your past alerts and trigger statuses in the Alerts panel.',
    category: 'Alerts'
  },
  // Data
  {
    question: 'Liquidation verileri nereden geliyor?',
    answer: 'Binance Futures piyasasından gerçek zamanlı liquidation verileri alınır. Premium özellik olarak Liquidations sekmesinden detaylı istatistiklere ulaşabilirsiniz.',
    questionEn: 'Where does liquidation data come from?',
    answerEn: 'Real-time liquidation data is received from Binance Futures market. As a premium feature, you can access detailed statistics from the Liquidations tab.',
    category: 'Data'
  },
  {
    question: 'AGGR nedir?',
    answer: 'AGGR (Aggregate Trades), farklı borsalardan toplanan işlem verilerini bir arada gösteren gelişmiş bir analiz aracıdır. Premium özellik olarak sunulmaktadır.',
    questionEn: 'What is AGGR?',
    answerEn: 'AGGR (Aggregate Trades) is an advanced analysis tool that displays aggregated trade data from different exchanges. It is offered as a premium feature.',
    category: 'Data'
  },
  {
    question: 'Hangi borsalar destekleniyor?',
    answer: 'Şu anda Binance (Spot ve Futures), Bybit, OKX desteklenmektedir. Yakında daha fazla borsa eklenecek.',
    questionEn: 'Which exchanges are supported?',
    answerEn: 'Currently Binance (Spot and Futures), Bybit, and OKX are supported. More exchanges will be added soon.',
    category: 'Data'
  },
  // Billing
  {
    question: 'Premium üyelik avantajları nelerdir?',
    answer: 'Sınırsız alarm, otomatik fiyat takibi (7/24 backend), push notifications, Liquidations dashboard, AGGR menüsü, tüm timeframe\'lere erişim ve reklamsız deneyim.',
    questionEn: 'What are the premium membership benefits?',
    answerEn: 'Unlimited alerts, automatic price tracking (24/7 backend), push notifications, Liquidations dashboard, AGGR menu, access to all timeframes, and ad-free experience.',
    category: 'Billing'
  },
  {
    question: 'Ücretsiz deneme süresi var mı?',
    answer: 'Evet! İlk kayıt olduğunuzda 3 gün ücretsiz premium deneme süresi kazanırsınız.',
    questionEn: 'Is there a free trial period?',
    answerEn: 'Yes! You get 3 days of free premium trial when you first register.',
    category: 'Billing'
  },
  {
    question: 'Aboneliği nasıl iptal edebilirim?',
    answer: 'iOS: App Store > Abonelikler. Android: Google Play > Abonelikler. Buradan aboneliğinizi yönetebilirsiniz.',
    questionEn: 'How can I cancel my subscription?',
    answerEn: 'iOS: App Store > Subscriptions. Android: Google Play > Subscriptions. You can manage your subscription from there.',
    category: 'Billing'
  },
  {
    question: 'Ödeme yöntemleri nelerdir?',
    answer: 'iOS için Apple In-App Purchase, Android için Google Play Billing kullanılır. Kredi kartı, banka kartı ve App Store/Play Store bakiyesi ile ödeme yapabilirsiniz.',
    questionEn: 'What are the payment methods?',
    answerEn: 'Apple In-App Purchase for iOS, Google Play Billing for Android. You can pay with credit card, debit card, and App Store/Play Store balance.',
    category: 'Billing'
  },
  // Genel
  {
    question: 'Uygulama hangi cihazlarda çalışır?',
    answer: 'iOS (iPhone/iPad), Android telefonlar ve web tarayıcılar (Chrome, Safari, Firefox) desteklenmektedir.',
    questionEn: 'Which devices does the app work on?',
    answerEn: 'iOS (iPhone/iPad), Android phones, and web browsers (Chrome, Safari, Firefox) are supported.',
    category: 'Chart'
  },
  {
    question: 'Çizimlerim ve ayarlarım kaydediliyor mu?',
    answer: 'Evet! Tüm çizimleriniz, alarm ayarlarınız ve grafik tercihleri cihazınızda (localStorage) kaydedilir.',
    questionEn: 'Are my drawings and settings saved?',
    answerEn: 'Yes! All your drawings, alert settings, and chart preferences are saved on your device (localStorage).',
    category: 'Chart'
  },
  {
    question: 'İnternet bağlantısı olmadan kullanabilir miyim?',
    answer: 'Hayır, gerçek zamanlı fiyat verileri için internet bağlantısı gereklidir. Ancak önceden yüklenmiş grafikler görüntülenebilir.',
    questionEn: 'Can I use it without an internet connection?',
    answerEn: 'No, internet connection is required for real-time price data. However, previously loaded charts can be viewed.',
    category: 'Chart'
  },
];

const categories = [
  { id: 'all', name: 'Tümü', nameEn: 'All' },
  { id: 'Chart', name: 'Grafik', nameEn: 'Chart' },
  { id: 'Trading', name: 'Trading', nameEn: 'Trading' },
  { id: 'Data', name: 'Veri', nameEn: 'Data' },
  { id: 'Alerts', name: 'Alarmlar', nameEn: 'Alerts' },
  { id: 'Billing', name: 'Ödeme', nameEn: 'Billing' },
];

export default function HelpCenter() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
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
      const savedLanguage = localStorage.getItem('language') as 'tr' | 'en' | null;
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }
  }, []);
  
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
    const question = language === 'tr' ? faq.question : faq.questionEn;
    const answer = language === 'tr' ? faq.answer : faq.answerEn;
    const matchesSearch = question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 pt-12">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors mt-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'tr' ? 'Geri' : 'Back'}</span>
          </button>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
            {language === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
          </h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder={language === 'tr' ? 'Cevabınızı bulun...' : 'Find your answer...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Popular Categories */}
          <div className="mt-6">
            <p className="text-center text-gray-400 mb-4">
              {language === 'tr' ? 'Popüler Kategoriler' : 'Popular categories'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {language === 'tr' ? cat.name : cat.nameEn}
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all cursor-pointer group">
            <div className="bg-blue-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Book className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {language === 'tr' ? 'Bilgi Bankası' : 'Knowledge base'}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr' 
                ? 'İhtiyacınız olan her şeyi kapsayan makaleler' 
                : 'Find articles covering everything you need'}
            </p>
          </div>

          {/* Chat Assistant - FAQ Section */}
          <a
            href="#faq"
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group"
          >
            <div className="bg-purple-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {language === 'tr' ? 'Sık Sorulan Sorular' : 'Chat assistant'}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr' 
                ? 'Sorularınıza anında yanıt alın' 
                : 'Get instant help with your questions'}
            </p>
          </a>

          {/* Support Requests */}
          <a
            href={`mailto:info@alertachart.com?subject=${encodeURIComponent('AlertaChart Destek Talebi')}&body=${encodeURIComponent('Merhaba AlertaChart ekibi,\n\n[Lütfen sorunuzu veya önerinizi buraya yazın]\n\n---\nCihaz: ' + (typeof navigator !== 'undefined' ? navigator.userAgent : ''))}`}
            onClick={handleMailLink}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group text-left block"
          >
            <div className="bg-green-500/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mail className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {language === 'tr' ? 'Destek Talebi' : 'Support requests'}
            </h3>
            <p className="text-gray-400 text-sm">
              {language === 'tr' 
                ? 'Ekibimize sorularınızı iletin' 
                : 'Manage your queries to our team'}
            </p>
          </a>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="scroll-mt-24">
          <h2 className="text-3xl font-bold mb-8">
            {language === 'tr' ? 'Sık Sorulan Sorular' : 'Frequently Asked Questions'}
          </h2>
          
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">
                {language === 'tr' 
                  ? 'Hiçbir sonuç bulunamadı. Lütfen farklı anahtar kelimeler deneyin.' 
                  : 'No results found. Please try different keywords.'}
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
                    <span>{language === 'tr' ? faq.question : faq.questionEn}</span>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-800 text-gray-400 leading-relaxed">
                    {language === 'tr' ? faq.answer : faq.answerEn}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* More to Explore */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">
            {language === 'tr' ? 'Daha Fazlası' : 'More to explore'}
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
                  {language === 'tr' ? 'Başlangıç Rehberi' : 'Getting started'}
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
                  {language === 'tr' ? 'Bizimle İletişime Geçin' : 'Contact Us'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>
            {language === 'tr' 
              ? 'Hala yardıma mı ihtiyacınız var? ' 
              : 'Still need help? '}
            <a
              href={`mailto:info@alertachart.com?subject=${encodeURIComponent('AlertaChart Destek Talebi')}&body=${encodeURIComponent('Merhaba AlertaChart ekibi,\n\n[Lütfen sorunuzu veya önerinizi buraya yazın]\n\n---\nCihaz: ' + (typeof navigator !== 'undefined' ? navigator.userAgent : ''))}`}
              onClick={handleMailLink}
              className="text-blue-400 hover:text-blue-300 transition-colors underline"
            >
              {language === 'tr' ? 'Destek ekibimize ulaşın' : 'Contact our support team'}
            </a>
          </p>
        </div>
      </div>

      {/* Support Request Modal */}
      <SupportRequestModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        language={language}
      />
    </div>
  );
}

