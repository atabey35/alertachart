'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('🔔');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if already logged in (from sessionStorage)
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        setIsLoggedIn(true);
      } else {
        setLoginError(data.error || 'Giriş başarısız!');
      }
    } catch (error) {
      setLoginError('Bağlantı hatası!');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    setIsLoggedIn(false);
    setLoginUsername('');
    setLoginPassword('');
  };

  const emojiOptions = [
    '🔔', '📢', '⚠️', '🚀', '📈', '📉', 
    '₿', 'Ξ', '◎', '💰', '🎉', '⚡',
    '🔥', '💎', '🌟', '✅', '❌', '📊'
  ];

  const quickMessages = [
    { title: 'Önemli Duyuru', message: 'Yeni özellikler eklendi! Uygulamayı güncelleyin.' },
    { title: 'Bakım Bildirimi', message: 'Sistem bakımı yapılacaktır. Tarih: ' },
    { title: 'Piyasa Uyarısı', message: 'Piyasada yüksek volatilite bekleniyor!' },
  ];

  const handleSend = async () => {
    if (!title || !message) {
      setResult({ success: false, message: 'Başlık ve mesaj gerekli!' });
      return;
    }

    if (!password) {
      setResult({ success: false, message: 'Admin şifresi gerekli!' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${emoji} ${title}`,
          message,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ 
          success: true, 
          message: `✅ Bildirim ${data.sent} cihaza gönderildi!` 
        });
        setTitle('');
        setMessage('');
      } else {
        setResult({ 
          success: false, 
          message: data.error || 'Gönderim başarısız!' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: 'Bağlantı hatası!' 
      });
    } finally {
      setSending(false);
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Paneli
            </h1>
            <p className="text-gray-400">
              Giriş yapmak için bilgilerinizi girin
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
            {/* Username */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Kullanıcı adınız"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {loginError}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
            >
              {loggingIn ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : (
                '🔓 Giriş Yap'
              )}
            </button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <h1 className="text-4xl font-bold text-white mb-2">
            🔐 Admin Panel
          </h1>
          <p className="text-gray-400">
            Tüm kullanıcılara push notification gönder
          </p>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
          >
            🚪 Çıkış Yap
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
          {/* Quick Messages */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hızlı Mesajlar
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {quickMessages.map((quick, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTitle(quick.title);
                    setMessage(quick.message);
                  }}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left text-sm transition-colors"
                >
                  <div className="font-medium text-white">{quick.title}</div>
                  <div className="text-xs text-gray-400 truncate">{quick.message}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emoji Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-12 h-12 rounded-lg text-2xl transition-all ${
                    emoji === e
                      ? 'bg-blue-600 scale-110 shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Başlık
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bildirim başlığı..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {title.length}/50
            </div>
          </div>

          {/* Message Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mesaj
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bildirim mesajı..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={200}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {message.length}/200
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admin Şifresi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {title && message && (
            <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Önizleme:</div>
              <div className="bg-white text-black p-4 rounded-lg shadow-lg max-w-sm">
                <div className="font-semibold mb-1">
                  {emoji} {title}
                </div>
                <div className="text-sm text-gray-700">
                  {message}
                </div>
              </div>
            </div>
          )}

          {/* Result Message */}
          {result && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-900/30 border border-green-700 text-green-300'
                  : 'bg-red-900/30 border border-red-700 text-red-300'
              }`}
            >
              {result.message}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !title || !message || !password}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
          >
            {sending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Gönderiliyor...
              </span>
            ) : (
              '📤 Herkese Gönder'
            )}
          </button>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
            <div className="text-xs text-blue-300 space-y-1">
              <div>• Bildirim tüm kayıtlı cihazlara gönderilecek</div>
              <div>• Uygulama kapalı olsa bile bildirim gidecek</div>
              <div>• Emoji ve başlık bildirimde görünecek</div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

