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
            <strong>Last Updated:</strong> November 29, 2025
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
            <p className="text-gray-300 leading-relaxed mb-4">
              When you create an account (by signing in with Apple or Google), the following information is collected:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">Email address:</strong> For account management and communication</li>
              <li><strong className="text-white">Name:</strong> For profile information</li>
              <li><strong className="text-white">Authentication provider:</strong> Apple or Google</li>
              <li><strong className="text-white">Subscription information:</strong> Premium membership status and expiration date</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              The data we collect is <strong className="text-white">minimal and only necessary</strong> for the app to function, 
              and is never shared with third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Data Usage</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Collected data is used only for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li>User account management</li>
              <li>Providing premium subscription services</li>
              <li>Sending price alerts</li>
              <li>Personalizing app features</li>
              <li>Providing technical support</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              <strong className="text-white">Your data is never used for advertising, marketing, or third-party services.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              The application uses the following secure infrastructure for data storage and management:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">Railway PostgreSQL:</strong> Secure storage of user data</li>
              <li><strong className="text-white">Apple Sign In:</strong> Secure authentication (iOS)</li>
              <li><strong className="text-white">Google Sign In:</strong> Secure authentication (Android/Web)</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              These services provide secure data storage servers and are subject to their own privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Third-Party Sharing</h2>
            <p className="text-gray-300 leading-relaxed">
              Your personal data is <strong className="text-white">never shared, sold, or rented to third parties</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Your data will not be disclosed in any way except for legal obligations (court orders, etc.).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. User Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Under GDPR and data protection laws, you have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
              <li><strong className="text-white">Right to Access:</strong> Learn what data is collected about you</li>
              <li><strong className="text-white">Right to Rectification:</strong> Request correction of inaccurate information</li>
              <li><strong className="text-white">Right to Erasure:</strong> Delete your account and all data (Settings &gt; Delete Account)</li>
              <li><strong className="text-white">Right to Data Portability:</strong> Obtain a copy of your data</li>
              <li><strong className="text-white">Right to Object:</strong> Object to data processing</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@alertachart.com" className="text-blue-400 hover:text-blue-300 underline">
                info@alertachart.com
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Account Deletion</h2>
            <p className="text-gray-300 leading-relaxed">
              You can delete your account at any time from <strong className="text-white">Settings &gt; Delete Account</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Account deletion is <strong className="text-white">irreversible</strong> and all your data (profile, alerts, settings) 
              will be permanently deleted. If you have an active premium subscription, you must manually cancel it from 
              App Store or Google Play settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              Our site only uses <strong className="text-white">essential technical cookies</strong> to improve user experience.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Advertising or analytics cookies are not used.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our services <strong className="text-white">do not target users under 13 years of age</strong>, and personal data 
              from this age group is not knowingly collected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Security</h2>
            <p className="text-gray-300 leading-relaxed">
              Data security is our priority. We implement the following measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300 mt-3">
              <li>Secure data transmission with SSL/TLS encryption</li>
              <li>Secure database infrastructure (Railway PostgreSQL)</li>
              <li>Secure authentication with OAuth 2.0</li>
              <li>Regular security updates</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              However, no data transmission over the internet can be guaranteed to be 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes</h2>
            <p className="text-gray-300 leading-relaxed">
              This privacy policy may be updated from time to time. Significant changes will be notified within the app. 
              The current version will always be published at{' '}
              <a 
                href="https://alertachart.com/privacy" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                https://alertachart.com/privacy
              </a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions or requests about our privacy policy:
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
