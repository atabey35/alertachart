import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları - Alerta Chart',
  description: 'Alerta Chart kullanım koşulları ve kullanıcı sözleşmesi.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsOfUsePage() {
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
              href="/terms/en" 
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors text-gray-300"
            >
              English
            </a>
            <a 
              href="/terms" 
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Kullanım Koşulları</h1>
          <p className="text-gray-400 mb-8">
            <strong>Son Güncelleme:</strong> 29 Kasım 2025
          </p>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            {/* Turkish Content */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 mt-8">1. Kabul Edilme</h2>
              <p className="text-gray-300 leading-relaxed">
                AlertaChart uygulamasını (&quot;Uygulama&quot;) kullanarak bu Kullanım Koşullarını kabul etmiş olursunuz. 
                Bu koşulları kabul etmiyorsanız, lütfen uygulamayı kullanmayınız.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Hizmet Açıklaması</h2>
              <p className="text-gray-300 leading-relaxed">
                AlertaChart, kripto para piyasaları için gerçek zamanlı grafik, fiyat takibi ve bildirim hizmetleri sunar. 
                Uygulama, teknik analiz araçları, çoklu grafik düzenleri ve premium özellikler içerir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Kullanıcı Hesabı</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                Uygulamayı kullanmak için bir hesap oluşturmanız gerekebilir. Hesabınızın güvenliğinden siz sorumlusunuz ve 
                hesabınızda gerçekleşen tüm faaliyetlerden sorumlusunuz.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Hesabınızı istediğiniz zaman Ayarlar menüsünden &quot;Hesabı Sil&quot; seçeneği ile silebilirsiniz. 
                Hesap silme işlemi geri alınamaz ve tüm verileriniz kalıcı olarak silinir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Premium Abonelik</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                Uygulama, ücretli premium özellikler sunar. Premium abonelik, Apple App Store veya Google Play Store 
                üzerinden satın alınır ve ilgili mağazanın ödeme koşullarına tabidir.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li>Abonelik aylık olarak yenilenir</li>
                <li>İptal edilene kadar otomatik olarak devam eder</li>
                <li>İptal, App Store veya Google Play ayarlarından yapılmalıdır</li>
                <li>İptal, mevcut dönem sonunda geçerli olur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Kullanım Kısıtlamaları</h2>
              <p className="text-gray-300 leading-relaxed mb-3">Uygulamayı kullanırken aşağıdaki faaliyetler yasaktır:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li>Yasa dışı amaçlarla kullanım</li>
                <li>Başkalarının hesaplarına yetkisiz erişim</li>
                <li>Uygulamanın güvenliğini tehlikeye atma</li>
                <li>Otomatik sistemler veya botlar kullanma</li>
                <li>Uygulamayı kopyalama, tersine mühendislik yapma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Sorumluluk Reddi</h2>
              <p className="text-gray-300 leading-relaxed">
                Uygulama &quot;OLDUĞU GİBİ&quot; sunulmaktadır. Finansal tavsiye vermez. Tüm yatırım kararları kendi sorumluluğunuzdadır.
              </p>
              <p className="text-yellow-400 font-semibold mt-4">
                ⚠️ Kripto para yatırımları yüksek risklidir. Sadece kaybetmeyi göze alabileceğiniz parayı yatırın.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Veri ve Gizlilik</h2>
              <p className="text-gray-300 leading-relaxed">
                Kişisel verilerinizin nasıl toplandığı ve kullanıldığı hakkında bilgi için{' '}
                <a 
                  href="/privacy" 
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Gizlilik Politikamızı
                </a>{' '}
                inceleyiniz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Değişiklikler</h2>
              <p className="text-gray-300 leading-relaxed">
                Bu Kullanım Koşullarını istediğimiz zaman değiştirme hakkını saklı tutarız. 
                Önemli değişiklikler uygulama içinde bildirilecektir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. İletişim</h2>
              <p className="text-gray-300 leading-relaxed">
                Sorularınız için:{' '}
                <a 
                  href="mailto:info@alertachart.com" 
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  info@alertachart.com
                </a>
              </p>
            </section>

            <section className="pt-6 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                © 2025 AlertaChart. Tüm hakları saklıdır.
              </p>
            </section>
          </div>
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
          <p>&copy; 2025 Alerta Chart. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
