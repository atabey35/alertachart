import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Alerta Chart',
  description: 'Privacy policy for Alerta Chart and information about user data protection.',
  alternates: {
    canonical: '/privacy/en',
  },
};

export default function PrivacyPageEN() {
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
              className="px-3 py-1.5 text-sm bg-blue-600 border border-blue-500 rounded text-white"
            >
              English
            </a>
            <a 
              href="/privacy" 
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors text-gray-300"
            >
              Türkçe
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <article className="prose prose-invert prose-gray max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">
            <strong>Last Updated:</strong> November 4, 2025
          </p>
          <p className="text-gray-400 mb-8">
            <strong>Applicable Domain:</strong>{' '}
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
            <h2 className="text-2xl font-semibold text-white mb-4 mt-8">1. General Information</h2>
            <p className="text-gray-300 leading-relaxed">
              Alerta Chart (&quot;we&quot;, &quot;app&quot;, or &quot;site&quot;) is a platform that helps users monitor cryptocurrency prices, 
              create alerts, and manage watchlists. This privacy policy has been prepared to protect the privacy of our users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Data Collection</h2>
            <p className="text-gray-300 leading-relaxed">
              Currently, we <strong className="text-white">do not collect any personal data from users</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              No registration process or sharing of credentials is required to use the site or application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Future Features</h2>
            <p className="text-gray-300 leading-relaxed">
              In the future, if user login or account creation features are added, only{' '}
              <strong className="text-white">minimal personal data</strong> (e.g., email address) necessary for the service 
              to function may be requested.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              In such cases, users will be separately informed about data processing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed">
              The application uses <strong className="text-white">Neon Database</strong> infrastructure for data storage and management purposes.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              This service provides secure data storage servers, but no personal user data is processed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              Our site may only use <strong className="text-white">essential technical cookies</strong> to improve user experience.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Advertising or analytics cookies are not used.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our services <strong className="text-white">do not target users under 13 years of age</strong>, and personal data 
              from this age group is not knowingly collected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Security</h2>
            <p className="text-gray-300 leading-relaxed">
              Data security is important to us. The application implements reasonable technical measures to protect data. 
              However, no data transmission over the internet can be guaranteed to be completely secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Changes</h2>
            <p className="text-gray-300 leading-relaxed">
              This privacy policy may be updated from time to time. The current version will always be published at{' '}
              <a 
                href="https://alertachart.com/privacy" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://alertachart.com/privacy
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions or requests, you can contact us at:
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
            Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>&copy; 2025 Alerta Chart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

