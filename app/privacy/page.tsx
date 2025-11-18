import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası - Alerta Chart',
  description: 'Alerta Chart gizlilik politikası ve kullanıcı verilerinin korunması hakkında bilgiler.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/icon.png" alt="Alerta Chart Logo" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl md:text-2xl font-bold text-blue-500">ALERTA CHART</h1>
          </Link>
          <div className="flex gap-2">
            <a 
              href="/privacy/en" 
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors text-gray-300"
            >
              English
            </a>
            <a 
              href="/privacy" 
              className="px-3 py-1.5 text-sm bg-blue-600 border border-blue-500 rounded text-white"
            >
              Türkçe
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <article className="prose prose-invert prose-gray max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Gizlilik Politikası</h1>
          <p className="text-gray-400 mb-8">
            <strong>Son Güncelleme:</strong> 4 Kasım 2025
          </p>
          <p className="text-gray-400 mb-8">
            <strong>Geçerli Alan Adı:</strong>{' '}
            <a 
              href="https://alertachart.com" 
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://alertachart.com
            </a>
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">1. Genel Bilgi</h2>
            <p className="text-gray-300 leading-relaxed">
              Alerta Kripto Kırmızı (&quot;biz&quot;, &quot;uygulama&quot; veya &quot;site&quot;), kullanıcıların kripto para fiyatlarını 
              izlemelerine, alarm oluşturup takip listeleri yönetmelerine yardımcı olan bir platformdur. 
              Bu gizlilik politikası, kullanıcılarımızın gizliliğini korumak amacıyla hazırlanmıştır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Toplanan Veriler</h2>
            <p className="text-gray-300 leading-relaxed">
              Şu anda <strong className="text-white">kullanıcılardan herhangi bir kişisel veri toplamıyoruz</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Siteyi veya uygulamayı kullanmak için herhangi bir kayıt işlemi ya da kimlik bilgisi paylaşımı zorunlu değildir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Gelecekteki Özellikler</h2>
            <p className="text-gray-300 leading-relaxed">
              İleride kullanıcı girişi veya hesap oluşturma özelliği eklendiğinde, yalnızca hizmetin çalışması için{' '}
              <strong className="text-white">asgari düzeyde kişisel veri</strong> (örneğin e-posta adresi) talep edilebilir.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Bu durumda kullanıcılar, verilerin işlenmesiyle ilgili ayrıca bilgilendirilecektir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Üçüncü Taraf Hizmetleri</h2>
            <p className="text-gray-300 leading-relaxed">
              Uygulama, veri saklama ve yönetimi amacıyla <strong className="text-white">Neon Database</strong> altyapısını kullanmaktadır.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Bu hizmet, güvenli veri depolama sunucuları sağlar ancak kişisel kullanıcı verisi işlenmemektedir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Çerezler</h2>
            <p className="text-gray-300 leading-relaxed">
              Sitemiz, kullanıcı deneyimini geliştirmek için yalnızca <strong className="text-white">zorunlu teknik çerezler</strong> kullanabilir.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Reklam veya analiz amaçlı çerezler kullanılmamaktadır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Çocukların Gizliliği</h2>
            <p className="text-gray-300 leading-relaxed">
              Hizmetlerimiz <strong className="text-white">13 yaşından küçük kullanıcıları hedeflemez</strong> ve bu yaş grubuna ait 
              kişisel veriler bilerek toplanmaz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Güvenlik</h2>
            <p className="text-gray-300 leading-relaxed">
              Veri güvenliği bizim için önemlidir. Uygulama, verileri korumak için makul teknik önlemleri uygular. 
              Ancak internet üzerinden yapılan hiçbir veri aktarımının tamamen güvenli olduğu garanti edilemez.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Değişiklikler</h2>
            <p className="text-gray-300 leading-relaxed">
              Bu gizlilik politikası zaman zaman güncellenebilir. Güncel sürüm her zaman{' '}
              <a 
                href="https://alertachart.com/privacy" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://alertachart.com/privacy
              </a>{' '}
              adresinde yayınlanacaktır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. İletişim</h2>
            <p className="text-gray-300 leading-relaxed">
              Sorularınız veya talepleriniz için bizimle şu adresten iletişime geçebilirsiniz:
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              📧 <a 
                href="mailto:info@alertachart.com" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                info@alertachart.com
              </a>
            </p>
          </section>

        </article>

        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ana Sayfaya Dön
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>&copy; 2025 Alerta Chart - Kripto Kırmızı. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}

