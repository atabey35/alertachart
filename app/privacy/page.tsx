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
            <strong>Son Güncelleme:</strong> 29 Kasım 2025
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
              Alerta Chart (&quot;biz&quot;, &quot;uygulama&quot; veya &quot;site&quot;), kullanıcıların kripto para fiyatlarını 
              izlemelerine, alarm oluşturup takip listeleri yönetmelerine yardımcı olan bir platformdur. 
              Bu gizlilik politikası, kullanıcılarımızın gizliliğini korumak amacıyla hazırlanmıştır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Toplanan Veriler</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Kullanıcı hesabı oluşturduğunuzda (Apple veya Google ile giriş yaparak), şu bilgiler toplanır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">E-posta adresi:</strong> Hesap yönetimi ve iletişim için</li>
              <li><strong className="text-white">İsim:</strong> Profil bilgisi için</li>
              <li><strong className="text-white">Giriş sağlayıcısı:</strong> Apple veya Google</li>
              <li><strong className="text-white">Abonelik bilgisi:</strong> Premium üyelik durumu ve son kullanma tarihi</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Topladığımız veriler sadece uygulamanın çalışması için gerekli <strong className="text-white">asgari düzeydedir</strong> 
              ve kesinlikle üçüncü taraflarla paylaşılmaz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Verilerin Kullanımı</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Toplanan veriler yalnızca şu amaçlarla kullanılır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li>Kullanıcı hesabı yönetimi</li>
              <li>Premium abonelik hizmetlerinin sağlanması</li>
              <li>Fiyat uyarılarının gönderilmesi</li>
              <li>Uygulama özelliklerinin kişiselleştirilmesi</li>
              <li>Teknik destek sağlanması</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong className="text-white">Verileriniz asla reklam, pazarlama veya üçüncü taraf hizmetler için kullanılmaz.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Üçüncü Taraf Hizmetleri</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Uygulama, veri saklama ve yönetimi amacıyla aşağıdaki güvenli altyapıları kullanmaktadır:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">Railway PostgreSQL:</strong> Kullanıcı verilerinin güvenli saklanması</li>
              <li><strong className="text-white">Apple Sign In:</strong> Güvenli kimlik doğrulama (iOS)</li>
              <li><strong className="text-white">Google Sign In:</strong> Güvenli kimlik doğrulama (Android/Web)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Bu hizmetler güvenli veri depolama sunucuları sağlar ve kendi gizlilik politikalarına tabidir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Üçüncü Taraf Paylaşım</h2>
            <p className="text-gray-300 leading-relaxed">
              Kişisel verileriniz <strong className="text-white">hiçbir üçüncü tarafla paylaşılmaz, satılmaz veya kiralanmaz</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Yasal zorunluluklar (mahkeme kararı, vb.) dışında verileriniz hiçbir şekilde ifşa edilmez.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Kullanıcı Hakları</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              GDPR ve KVK Kanunu uyarınca aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">Erişim Hakkı:</strong> Hangi verilerinizin toplandığını öğrenme</li>
              <li><strong className="text-white">Düzeltme Hakkı:</strong> Yanlış bilgilerin düzeltilmesini isteme</li>
              <li><strong className="text-white">Silme Hakkı:</strong> Hesabınızı ve tüm verilerinizi silme (Ayarlar &gt; Hesabı Sil)</li>
              <li><strong className="text-white">Veri Taşınabilirliği:</strong> Verilerinizin kopyasını alma</li>
              <li><strong className="text-white">İtiraz Hakkı:</strong> Veri işlemeye itiraz etme</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Bu haklarınızı kullanmak için{' '}
              <a href="mailto:info@alertachart.com" className="text-blue-400 hover:text-blue-300 underline">
                info@alertachart.com
              </a>
              {' '}adresinden bizimle iletişime geçebilirsiniz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Hesap Silme</h2>
            <p className="text-gray-300 leading-relaxed">
              Hesabınızı istediğiniz zaman <strong className="text-white">Ayarlar &gt; Hesabı Sil</strong> seçeneğinden silebilirsiniz.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Hesap silme işlemi <strong className="text-white">geri alınamaz</strong> ve tüm verileriniz (profil, alarmlar, ayarlar) 
              kalıcı olarak silinir. Premium aboneliğiniz varsa, App Store veya Google Play ayarlarından manuel olarak iptal etmeniz gerekir.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Çerezler</h2>
            <p className="text-gray-300 leading-relaxed">
              Sitemiz, kullanıcı deneyimini geliştirmek için yalnızca <strong className="text-white">zorunlu teknik çerezler</strong> kullanır.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Reklam veya analiz amaçlı çerezler kullanılmamaktadır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Çocukların Gizliliği</h2>
            <p className="text-gray-300 leading-relaxed">
              Hizmetlerimiz <strong className="text-white">13 yaşından küçük kullanıcıları hedeflemez</strong> ve bu yaş grubuna ait 
              kişisel veriler bilerek toplanmaz.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Güvenlik</h2>
            <p className="text-gray-300 leading-relaxed">
              Veri güvenliği bizim için önceliktir. Verilerinizi korumak için şu önlemleri uygularız:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300 mt-3">
              <li>SSL/TLS şifreleme ile güvenli veri iletimi</li>
              <li>Güvenli veritabanı altyapısı (Railway PostgreSQL)</li>
              <li>OAuth 2.0 ile güvenli kimlik doğrulama</li>
              <li>Düzenli güvenlik güncellemeleri</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              Ancak internet üzerinden yapılan hiçbir veri aktarımının %100 güvenli olduğu garanti edilemez.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Değişiklikler</h2>
            <p className="text-gray-300 leading-relaxed">
              Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde bildirilecektir. 
              Güncel sürüm her zaman{' '}
              <a 
                href="https://alertachart.com/privacy" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://alertachart.com/privacy
              </a>
              {' '}adresinde yayınlanacaktır.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">12. İletişim</h2>
            <p className="text-gray-300 leading-relaxed">
              Gizlilik politikamız hakkında sorularınız veya talepleriniz için:
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
          <p>&copy; 2025 Alerta Chart. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
