'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaTwitter, FaDiscord, FaTelegram, FaYoutube, FaInstagram, FaTiktok } from 'react-icons/fa';

export default function SeoFooter() {
    const currentYear = new Date().getFullYear();
    const [isNativeApp, setIsNativeApp] = useState(false);

    useEffect(() => {
        // Check if running in Capacitor (Native App)
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
            setIsNativeApp(true);
        }
    }, []);

    // Don't render completely if in native app
    if (isNativeApp) {
        return null;
    }

    return (
        <footer className="w-full bg-[#050505] border-t border-white/5 pt-12 pb-8 px-4 md:px-8 mt-auto">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand & Description */}
                    <div className="col-span-1 md:col-span-2">
                        <h2 className="text-xl font-bold text-white mb-4">Alerta Chart</h2>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md">
                            Professional cryptocurrency charting platform offering advanced technical analysis tools,
                            real-time market data, and multi-chart layouts completely free.
                            The comprehensive solution for advanced crypto traders.
                        </p>
                        <div className="flex gap-4">
                            <SocialLink href="https://twitter.com/alertachart" icon={<FaTwitter />} label="Twitter" />
                            <SocialLink href="https://discord.gg/alertachart" icon={<FaDiscord />} label="Discord" />
                            <SocialLink href="https://t.me/alertachart" icon={<FaTelegram />} label="Telegram" />
                            <SocialLink href="https://youtube.com/@alertachart" icon={<FaYoutube />} label="YouTube" />
                        </div>
                    </div>

                    {/* Features Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Features</h3>
                        <ul className="space-y-2">
                            <FooterLink href="/" label="Live Crypto Charts" />
                            <FooterLink href="/aggr" label="Aggregated Order Flow" />
                            <FooterLink href="/data/liquidation-tracker" label="Liquidation Heatmap" />
                            <FooterLink href="/news" label="Market News" />
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <FooterLink href="/blog" label="Trading Blog" />
                            <FooterLink href="/help" label="Help Center" />
                            <FooterLink href="/privacy" label="Privacy Policy" />
                            <FooterLink href="/terms" label="Terms of Service" />
                        </ul>
                    </div>
                </div>

                {/* SEO Content Block - Visual but keyword rich */}
                <div className="border-t border-white/5 pt-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-500">
                        <div>
                            <h4 className="text-gray-400 font-medium mb-2">Professional Crypto Charting</h4>
                            <p className="leading-relaxed mb-4">
                                Alerta Chart provides a powerful, professional-grade charting platform for cryptocurrency traders.
                                Access advanced features like 4x4 multi-chart layouts, specialized indicators
                                (RSI, MACD, Bollinger Bands), and real-time data for Bitcoin (BTC), Ethereum (ETH),
                                Solana (SOL), and 400+ other cryptocurrencies without any subscription fees.
                            </p>
                            <h4 className="text-gray-400 font-medium mb-2">Advanced Technical Analysis</h4>
                            <p className="leading-relaxed">
                                Utilize professional-grade drawing tools, Fibonacci retracements, and trend line analysis.
                                Our platform supports spot and futures trading pairs from major exchanges like Binance,
                                offering aggregated volume analysis and order flow visualization (FireCharts style)
                                to help you make informed trading decisions.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-gray-400 font-medium mb-2">Real-Time Crypto Market Data</h4>
                            <p className="leading-relaxed mb-4">
                                Stay ahead of the market with millisecond-latency price updates via WebSocket connections.
                                Track price movements, monitor volume spikes with our volume analyzer, and set instant
                                price alerts (push notifications) to never miss a trading opportunity.
                            </p>
                            <h4 className="text-gray-400 font-medium mb-2">Mobile Crypto Charting</h4>
                            <p className="leading-relaxed">
                                Experience full desktop functionality on mobile devices. Our responsive design ensures
                                you can analyze charts, draw patterns, and manage alerts seamlessly on iOS and Android.
                                Optimized for performance with low data usage and battery efficiency.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="text-center border-t border-white/5 pt-8 text-xs text-gray-600">
                    <p>&copy; {currentYear} Alerta Chart. All rights reserved.</p>
                    <p className="mt-2 text-[10px] text-gray-700">
                        Cryptocurrency trading involves high risk and is not suitable for all investors.
                        Alerta Chart provides data for informational purposes only and does not constitute financial advice.
                    </p>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10"
            aria-label={label}
        >
            {icon}
        </a>
    );
}

function FooterLink({ href, label }: { href: string; label: string }) {
    return (
        <li>
            <Link href={href} className="text-gray-400 hover:text-white text-sm transition-colors">
                {label}
            </Link>
        </li>
    );
}
