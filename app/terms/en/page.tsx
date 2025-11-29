import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use - Alerta Chart',
  description: 'Alerta Chart terms of use and user agreement.',
  alternates: {
    canonical: '/terms/en',
  },
};

export default function TermsOfUsePageEN() {
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
              className="px-3 py-1.5 text-sm bg-blue-600 border border-blue-500 rounded text-white"
            >
              English
            </a>
            <a 
              href="/terms" 
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Use</h1>
          <p className="text-gray-400 mb-8">
            <strong>Last Updated:</strong> November 29, 2025
          </p>

          <div className="space-y-8 text-gray-300 leading-relaxed">
            {/* English Content */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 mt-8">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By using the AlertaChart application (&quot;App&quot;), you agree to be bound by these Terms of Use. 
                If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Service Description</h2>
              <p className="text-gray-300 leading-relaxed">
                AlertaChart provides real-time charting, price tracking, and notification services for cryptocurrency markets. 
                The App includes technical analysis tools, multiple chart layouts, and premium features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Account</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                You may need to create an account to use the App. You are responsible for maintaining the security of your 
                account and for all activities that occur under your account.
              </p>
              <p className="text-gray-300 leading-relaxed">
                You can delete your account at any time from the Settings menu using the &quot;Delete Account&quot; option. 
                Account deletion is irreversible and all your data will be permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Premium Subscription</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                The App offers paid premium features. Premium subscriptions are purchased through the Apple App Store or 
                Google Play Store and are subject to their respective payment terms.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li>Subscriptions renew monthly</li>
                <li>Auto-renewal continues until canceled</li>
                <li>Cancellation must be done through App Store or Google Play settings</li>
                <li>Cancellation takes effect at the end of the current period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Usage Restrictions</h2>
              <p className="text-gray-300 leading-relaxed mb-3">When using the App, the following activities are prohibited:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li>Use for illegal purposes</li>
                <li>Unauthorized access to others&apos; accounts</li>
                <li>Compromising the App&apos;s security</li>
                <li>Using automated systems or bots</li>
                <li>Copying or reverse engineering the App</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Disclaimer</h2>
              <p className="text-gray-300 leading-relaxed">
                The App is provided &quot;AS IS&quot;. It does not provide financial advice. All investment decisions are your own responsibility.
              </p>
              <p className="text-yellow-400 font-semibold mt-4">
                ⚠️ Cryptocurrency investments are high risk. Only invest money you can afford to lose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data and Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                For information about how your personal data is collected and used, please review our{' '}
                <a 
                  href="/privacy/en" 
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Privacy Policy
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Changes</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these Terms of Use at any time. 
                Significant changes will be notified within the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Contact</h2>
              <p className="text-gray-300 leading-relaxed">
                For questions:{' '}
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
                © 2025 AlertaChart. All rights reserved.
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

