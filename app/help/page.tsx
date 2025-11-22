'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book, MessageCircle, Mail, ChevronRight, Search, ArrowLeft } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Chart
  {
    question: 'Grafik üzerinde nasıl alarm kurabilirim?',
    answer: 'Grafik üzerinde istediğiniz fiyat seviyesine sağ tıklayın ve "Set Alert" seçeneğini seçin. Alternatif olarak, sağdaki Alerts panelinden de alarm kurabilirsiniz.',
    category: 'Chart'
  },
  {
    question: 'Çizim araçlarını nasıl kullanabilirim?',
    answer: 'Grafik altındaki araç çubuğundan çizim araçlarına erişebilirsiniz. Trend çizgisi, yatay çizgi, Fibonacci gibi birçok araç mevcuttur. Mobilde sağ alttaki mavi butona basarak araçlara ulaşabilirsiniz.',
    category: 'Chart'
  },
  {
    question: 'Multi-chart layout nasıl kullanılır?',
    answer: 'Üst menüden 1x1, 1x2, 2x2 veya 3x3 grid düzenini seçebilirsiniz. Her bir grafikte farklı coin ve timeframe gösterebilirsiniz.',
    category: 'Chart'
  },
  {
    question: 'Grafik göstergeleri (indicators) nasıl eklenir?',
    answer: 'Grafik üzerindeki ayarlar butonuna tıklayın. Indicators bölümünden RSI, MACD, EMA, SMA, Bollinger Bands gibi göstergeleri aktif edebilirsiniz.',
    category: 'Chart'
  },
  // Trading
  {
    question: 'Spot ve Futures arasındaki fark nedir?',
    answer: 'Spot piyasada gerçek varlık alım satımı yapılırken, Futures\'da türev ürünler işlem görür. Üst menüden SPOT/FUTURES seçimi yapabilirsiniz.',
    category: 'Trading'
  },
  {
    question: 'Watchlist\'e nasıl coin eklerim?',
    answer: 'Watchlist panelindeki "+" butonuna tıklayın. Arama yaparak istediğiniz coin\'i bulun ve ekleyin. Ayrıca kategori filtreleri ile de coin bulabilirsiniz.',
    category: 'Trading'
  },
  {
    question: 'Gerçek zamanlı fiyat güncellemeleri nasıl çalışır?',
    answer: 'Binance WebSocket bağlantısı üzerinden gerçek zamanlı fiyat verileri alınır. Bağlantı durumunu grafik üzerindeki yeşil/kırmızı nokta ile görebilirsiniz.',
    category: 'Trading'
  },
  // Alerts
  {
    question: 'Alarmlarım nasıl bildiriliyor?',
    answer: 'Premium üyeler için push notification (mobil bildirim) ve backend üzerinden otomatik takip. Free kullanıcılar için uygulama açık olduğunda bildirim.',
    category: 'Alerts'
  },
  {
    question: 'Kaç tane alarm kurabilirim?',
    answer: 'Free plan: 5 alarm. Premium plan: Sınırsız alarm kurabilirsiniz.',
    category: 'Alerts'
  },
  {
    question: 'Alarmlarım otomatik takip ediliyor mu?',
    answer: 'Premium üyeler için evet! Backend sunucumuz 7/24 fiyatları takip eder ve alarm tetiklendiğinde push notification gönderir. Uygulama kapalı olsa bile bildirim alırsınız.',
    category: 'Alerts'
  },
  {
    question: 'Alarm geçmişini görebilir miyim?',
    answer: 'Evet, Alerts panelinde geçmiş alarmlarınızı ve tetiklenme durumlarını görebilirsiniz.',
    category: 'Alerts'
  },
  // Data
  {
    question: 'Liquidation verileri nereden geliyor?',
    answer: 'Binance Futures piyasasından gerçek zamanlı liquidation verileri alınır. Premium özellik olarak Liquidations sekmesinden detaylı istatistiklere ulaşabilirsiniz.',
    category: 'Data'
  },
  {
    question: 'AGGR nedir?',
    answer: 'AGGR (Aggregate Trades), farklı borsalardan toplanan işlem verilerini bir arada gösteren gelişmiş bir analiz aracıdır. Premium özellik olarak sunulmaktadır.',
    category: 'Data'
  },
  {
    question: 'Hangi borsalar destekleniyor?',
    answer: 'Şu anda Binance (Spot ve Futures), Bybit, OKX desteklenmektedir. Yakında daha fazla borsa eklenecek.',
    category: 'Data'
  },
  // Billing
  {
    question: 'Premium üyelik avantajları nelerdir?',
    answer: 'Sınırsız alarm, otomatik fiyat takibi (7/24 backend), push notifications, Liquidations dashboard, AGGR menüsü, tüm timeframe\'lere erişim ve reklamsız deneyim.',
    category: 'Billing'
  },
  {
    question: 'Ücretsiz deneme süresi var mı?',
    answer: 'Evet! İlk kayıt olduğunuzda 3 gün ücretsiz premium deneme süresi kazanırsınız.',
    category: 'Billing'
  },
  {
    question: 'Aboneliği nasıl iptal edebilirim?',
    answer: 'iOS: App Store > Abonelikler. Android: Google Play > Abonelikler. Buradan aboneliğinizi yönetebilirsiniz.',
    category: 'Billing'
  },
  {
    question: 'Ödeme yöntemleri nelerdir?',
    answer: 'iOS için Apple In-App Purchase, Android için Google Play Billing kullanılır. Kredi kartı, banka kartı ve App Store/Play Store bakiyesi ile ödeme yapabilirsiniz.',
    category: 'Billing'
  },
  // Genel
  {
    question: 'Uygulama hangi cihazlarda çalışır?',
    answer: 'iOS (iPhone/iPad), Android telefonlar ve web tarayıcılar (Chrome, Safari, Firefox) desteklenmektedir.',
    category: 'Chart'
  },
  {
    question: 'Çizimlerim ve ayarlarım kaydediliyor mu?',
    answer: 'Evet! Tüm çizimleriniz, alarm ayarlarınız ve grafik tercihleri cihazınızda (localStorage) kaydedilir.',
    category: 'Chart'
  },
  {
    question: 'İnternet bağlantısı olmadan kullanabilir miyim?',
    answer: 'Hayır, gerçek zamanlı fiyat verileri için internet bağlantısı gereklidir. Ancak önceden yüklenmiş grafikler görüntülenebilir.',
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
  const [language] = useState<'tr' | 'en'>('tr'); // Dil desteği için

  // Arama ve kategori filtreleme
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Mail gönderimi
  const handleSupportRequest = () => {
    const subject = encodeURIComponent('AlertaChart Destek Talebi');
    const body = encodeURIComponent(
      'Merhaba AlertaChart ekibi,\n\n[Lütfen sorunuzu veya önerinizi buraya yazın]\n\n---\nCihaz: ' + navigator.userAgent
    );
    window.location.href = `mailto:info@alertachart.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Geri</span>
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
          <button
            onClick={handleSupportRequest}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all group text-left"
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
          </button>
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
                    <span>{faq.question}</span>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gray-800 text-gray-400 leading-relaxed">
                    {faq.answer}
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
              onClick={handleSupportRequest}
              className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all group flex items-center justify-between text-left"
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
            <button
              onClick={handleSupportRequest}
              className="text-blue-400 hover:text-blue-300 transition-colors underline"
            >
              {language === 'tr' ? 'Destek ekibimize ulaşın' : 'Contact our support team'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

