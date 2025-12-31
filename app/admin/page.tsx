'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactQuillWrapper from '@/components/ReactQuillWrapper';
import 'react-quill/dist/quill.snow.css'; // Quill editör stilleri

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
  const [targetLang, setTargetLang] = useState<'all' | 'tr' | 'en'>('all'); // 🔥 MULTILINGUAL: Dil seçimi
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Support requests state
  const [activeTab, setActiveTab] = useState<'broadcast' | 'support' | 'news' | 'blog'>('broadcast');
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<number, string>>({});

  // News state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsCategory, setNewsCategory] = useState<'crypto' | 'finance'>('crypto');
  const [newsSource, setNewsSource] = useState('Alerta Chart');
  const [newsAuthor, setNewsAuthor] = useState('');
  const [newsUrl, setNewsUrl] = useState('');
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [creatingNews, setCreatingNews] = useState(false);

  // Blog state
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loadingBlogPosts, setLoadingBlogPosts] = useState(false);
  const [addBlogPostOpen, setAddBlogPostOpen] = useState(false);
  const [addBlogPostForm, setAddBlogPostForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    category: '',
    author: '',
    authorImage: '',
    readTime: '5',
    featured: false,
    tags: '' // Comma-separated tags string
  });
  const [addBlogPostMsg, setAddBlogPostMsg] = useState('');
  const [addBlogPostLoading, setAddBlogPostLoading] = useState(false);
  const [deleteBlogPostLoading, setDeleteBlogPostLoading] = useState<string | null>(null);
  const [deleteBlogPostError, setDeleteBlogPostError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [authorImageUploading, setAuthorImageUploading] = useState(false);
  const [migratingTags, setMigratingTags] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if already logged in (from sessionStorage)
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('adminLoggedIn');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch support requests
  const fetchSupportRequests = async () => {
    setLoadingSupport(true);
    try {
      const response = await fetch('/api/admin/support-requests?password=' + encodeURIComponent(loginPassword || sessionStorage.getItem('adminPassword') || ''));
      const data = await response.json();
      if (response.ok) {
        setSupportRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching support requests:', error);
    } finally {
      setLoadingSupport(false);
    }
  };

  // Load support requests when tab is active
  useEffect(() => {
    if (isLoggedIn && activeTab === 'support') {
      fetchSupportRequests();
    }
  }, [isLoggedIn, activeTab]);

  // Fetch blog posts
  const fetchBlogPosts = async () => {
    setLoadingBlogPosts(true);
    try {
      const response = await fetch(`/api/admin-blog`);
      const data = await response.json();
      if (response.ok) {
        setBlogPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoadingBlogPosts(false);
    }
  };

  // Load blog posts when tab is active
  useEffect(() => {
    if (isLoggedIn && activeTab === 'blog') {
      fetchBlogPosts();
    }
  }, [isLoggedIn, activeTab]);

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
        sessionStorage.setItem('adminPassword', loginPassword);
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
          targetLang, // 🔥 MULTILINGUAL: Dil seçimini backend'e gönder
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ Bildirim ${data.sent || data.notificationsSaved || 0} kullanıcıya gönderildi!`
        });
        setTitle('');
        setMessage('');

        // Trigger notification refresh event for all open tabs
        // This will immediately refresh notifications in header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('notification-refresh'));
        }
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

  // Create slug from title
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Create blog post
  const handleAddBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBlogPostLoading(true);
    setAddBlogPostMsg('');

    try {
      const formData = { ...addBlogPostForm };
      if (!formData.slug.trim()) {
        formData.slug = createSlug(formData.title);
      }

      const response = await fetch('/api/admin-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          readTime: parseInt(formData.readTime, 10) || 5,
        }),
      });

      // Response'u kontrol et
      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (parseErr) {
          console.error('Error parsing error response:', parseErr, 'Raw text:', errorText);
          errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        const errorMsg = errorData.error || errorData.details || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        setAddBlogPostMsg(`Hata: ${errorMsg}`);
        console.error('Blog yazısı ekleme hatası:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          rawText: errorText,
        });
        return;
      }

      // Başarılı response'u parse et
      const responseText = await response.text();
      let data;

      if (!responseText || responseText.trim() === '') {
        console.error('Boş response alındı');
        setAddBlogPostMsg('Sunucudan boş yanıt alındı.');
        return;
      }

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse hatası:', parseError, 'Response:', responseText);
        setAddBlogPostMsg('Sunucudan geçersiz yanıt alındı.');
        return;
      }

      // Başarılı
      setAddBlogPostMsg('Blog yazısı başarıyla eklendi!');
      setAddBlogPostForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        coverImage: '',
        category: '',
        author: '',
        authorImage: '',
        readTime: '5',
        featured: false,
        tags: ''
      });
      setAddBlogPostOpen(false);
      fetchBlogPosts();
    } catch (error: any) {
      setAddBlogPostMsg('Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      console.error('Blog yazısı eklenirken hata:', error);
    } finally {
      setAddBlogPostLoading(false);
    }
  };

  // Run blog tags migration
  const handleMigrateBlogTags = async () => {
    if (!confirm('Blog tags migration\'ını çalıştırmak istediğinize emin misiniz? Bu işlem tags kolonunu ekleyecek.')) return;

    setMigratingTags(true);
    setMigrationResult(null);

    try {
      const password = loginPassword || sessionStorage.getItem('adminPassword') || '';
      const response = await fetch('/api/admin/migrate-blog-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMigrationResult({
          success: true,
          message: data.alreadyExists
            ? '✅ Tags kolonu zaten mevcut. Migration gerekmiyor.'
            : '✅ Migration başarıyla tamamlandı! Tags kolonu eklendi.',
        });
      } else {
        setMigrationResult({
          success: false,
          message: data.error || 'Migration başarısız oldu.',
        });
      }
    } catch (error: any) {
      setMigrationResult({
        success: false,
        message: 'Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'),
      });
    } finally {
      setMigratingTags(false);
    }
  };

  // Delete blog post
  const handleDeleteBlogPost = async (id: string) => {
    if (!confirm('Bu blog yazısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setDeleteBlogPostLoading(id);
    setDeleteBlogPostError('');
    try {
      const response = await fetch('/api/admin-blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        fetchBlogPosts();
      } else {
        setDeleteBlogPostError('Blog yazısı silinemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      setDeleteBlogPostError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setDeleteBlogPostLoading(null);
    }
  };

  // Görsel yükleme işleyicileri
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setImageUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Response'u text olarak al, sonra JSON'a çevir
      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse hatası:', parseError, 'Response:', responseText);
        throw new Error('Sunucudan geçersiz yanıt alındı.');
      }

      if (result.success) {
        // Başarılı yükleme, URL'yi forma ekle
        setAddBlogPostForm({
          ...addBlogPostForm,
          coverImage: result.url
        });
      } else {
        // Hata durumunda kullanıcıya bildir
        alert(`Görsel yükleme hatası: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error: any) {
      console.error('Görsel yükleme hatası:', error);
      alert(`Görsel yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setImageUploading(false);
    }
  };

  // Yazar görseli yükleme işleyicisi
  const handleAuthorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setAuthorImageUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Response'u text olarak al, sonra JSON'a çevir
      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse hatası:', parseError, 'Response:', responseText);
        throw new Error('Sunucudan geçersiz yanıt alındı.');
      }

      if (result.success) {
        // Başarılı yükleme, URL'yi forma ekle
        setAddBlogPostForm({
          ...addBlogPostForm,
          authorImage: result.url
        });
      } else {
        // Hata durumunda kullanıcıya bildir
        alert(`Görsel yükleme hatası: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error: any) {
      console.error('Yazar görseli yükleme hatası:', error);
      alert(`Görsel yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setAuthorImageUploading(false);
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
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
          <form onSubmit={handleLogin} className="bg-[#111111]/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-zinc-800/50">
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
                className="w-full px-4 py-3 bg-[#0B0B0B] border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
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
                className="w-full px-4 py-3 bg-[#0B0B0B] border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
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
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
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
    <div className="min-h-screen bg-[#0B0B0B] p-4 md:p-10" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <h1 className="text-4xl font-extrabold mb-2 text-white tracking-tight flex items-center justify-center gap-3">
            🔐 <span>Admin Panel</span>
            <span className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono uppercase tracking-wider rounded">ADMIN</span>
          </h1>
          <p className="text-zinc-400 font-medium">
            Tüm kullanıcılara push notification gönder
          </p>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 px-4 py-2.5 bg-transparent border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50 text-white text-sm font-medium rounded-lg transition-all"
          >
            🚪 Çıkış Yap
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-zinc-800/50">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-6 py-3.5 font-semibold transition-all duration-200 border-b-2 ${activeTab === 'broadcast'
              ? 'border-orange-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
              }`}
          >
            📢 Bildirim Gönder
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-6 py-3.5 font-semibold transition-all duration-200 border-b-2 ${activeTab === 'news'
              ? 'border-orange-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
              }`}
          >
            📰 Haber Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-6 py-3.5 font-semibold transition-all duration-200 border-b-2 ${activeTab === 'blog'
              ? 'border-orange-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
              }`}
          >
            📝 Blog Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-6 py-3.5 font-semibold transition-all duration-200 border-b-2 ${activeTab === 'support'
              ? 'border-orange-500 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
              }`}
          >
            💬 Destek Talepleri
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-[#111111]/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-zinc-800/50">
          {activeTab === 'broadcast' ? (
            <>
              {/* Quick Messages */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Hızlı Mesajlar
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {quickMessages.map((quick, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTitle(quick.title);
                        setMessage(quick.message);
                      }}
                      className="p-4 bg-[#0B0B0B] hover:bg-zinc-900 border border-zinc-800/50 hover:border-orange-500/50 rounded-xl text-left text-sm transition-all duration-200 hover:scale-[1.02] shadow-sm"
                    >
                      <div className="font-semibold text-white mb-1">{quick.title}</div>
                      <div className="text-xs text-zinc-400 truncate">{quick.message}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emoji Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-12 h-12 rounded-xl text-2xl transition-all duration-200 ${emoji === e
                        ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 scale-110 shadow-lg shadow-blue-500/20'
                        : 'bg-[#0d0d12] border border-gray-800/50 hover:bg-[#1a1a1f] hover:border-gray-700/50 hover:scale-105'
                        }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Başlık
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bildirim başlığı..."
                  className="w-full px-4 py-3.5 bg-[#0d0d12] border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 font-medium"
                  maxLength={50}
                />
                <div className="text-xs text-gray-500 mt-2 text-right font-medium">
                  {title.length}/50
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Mesaj
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bildirim mesajı..."
                  rows={4}
                  className="w-full px-4 py-3.5 bg-[#0d0d12] border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-200 font-medium"
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-2 text-right font-medium">
                  {message.length}/200
                </div>
              </div>

              {/* 🔥 MULTILINGUAL: Dil Seçimi */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Hedef Kitle (Target Audience)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTargetLang('all')}
                    className={`px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${targetLang === 'all'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10 scale-105'
                      : 'bg-[#0d0d12] text-gray-300 border border-gray-800/50 hover:bg-[#1a1a1f] hover:border-gray-700/50 hover:scale-[1.02]'
                      }`}
                  >
                    🌍 Herkes (All)
                  </button>
                  <button
                    onClick={() => setTargetLang('tr')}
                    className={`px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${targetLang === 'tr'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10 scale-105'
                      : 'bg-[#0d0d12] text-gray-300 border border-gray-800/50 hover:bg-[#1a1a1f] hover:border-gray-700/50 hover:scale-[1.02]'
                      }`}
                  >
                    🇹🇷 Türkçe
                  </button>
                  <button
                    onClick={() => setTargetLang('en')}
                    className={`px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${targetLang === 'en'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10 scale-105'
                      : 'bg-[#0d0d12] text-gray-300 border border-gray-800/50 hover:bg-[#1a1a1f] hover:border-gray-700/50 hover:scale-[1.02]'
                      }`}
                  >
                    🌐 Global (EN)
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-3 font-medium">
                  {targetLang === 'all' && '• Tüm kullanıcılara gönderilir'}
                  {targetLang === 'tr' && '• Sadece Türkçe dil ayarlı cihazlara gönderilir'}
                  {targetLang === 'en' && '• Türkçe olmayan tüm cihazlara gönderilir (Global)'}
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Admin Şifresi
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-[#0d0d12] border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 font-medium"
                />
              </div>

              {/* Preview */}
              {title && message && (
                <div className="mb-6 p-5 bg-[#0d0d12]/80 backdrop-blur-sm rounded-xl border border-gray-800/50 shadow-lg">
                  <div className="text-xs font-semibold text-gray-400 mb-3">Önizleme:</div>
                  <div className="bg-white text-black p-5 rounded-xl shadow-2xl max-w-sm">
                    <div className="font-bold mb-2 text-base">
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
                  className={`mb-6 p-4 rounded-xl font-medium ${result.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}
                >
                  {result.message}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || !title || !message || !password}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg shadow-emerald-500/20"
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
                  `📤 ${targetLang === 'all' ? 'Herkese' : targetLang === 'tr' ? 'Türkçe Kullanıcılara' : 'Global Kullanıcılara'} Gönder`
                )}
              </button>

              {/* Info */}
              <div className="mt-6 p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="text-sm text-blue-300 space-y-2 font-medium">
                  <div>• Bildirim tüm kayıtlı cihazlara gönderilecek</div>
                  <div>• Uygulama kapalı olsa bile bildirim gidecek</div>
                  <div>• Emoji ve başlık bildirimde görünecek</div>
                </div>
              </div>
            </>
          ) : activeTab === 'support' ? (
            <>
              {/* Support Requests Tab */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  💬 Destek Talepleri
                </h2>
                <button
                  onClick={fetchSupportRequests}
                  disabled={loadingSupport}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:scale-[1.02] disabled:hover:scale-100"
                >
                  {loadingSupport ? '⌛ Yüklen iyor...' : '🔄 Yenile'}
                </button>
              </div>

              {loadingSupport ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Yüklen iyor...</p>
                </div>
              ) : supportRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151519]/60 backdrop-blur-sm rounded-2xl border border-gray-800/50">
                  <p className="text-gray-400 text-lg">📥 Henüz destek talebi yok</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                  {supportRequests.map((request: any) => {
                    const isReplying = replyingTo === request.id;
                    const currentReply = replyText[request.id] || request.admin_reply || '';
                    const currentStatus = replyStatus[request.id] || request.status;

                    return (
                      <div
                        key={request.id}
                        className="bg-[#151519]/60 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all shadow-lg"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
                                {request.topic === 'general' ? '🏛️ Genel' :
                                  request.topic === 'technical' ? '🔧 Teknik' :
                                    request.topic === 'billing' ? '💳 Ödeme' :
                                      request.topic === 'feature' ? '✨ Özellik' :
                                        request.topic === 'bug' ? '🐛 Hata' : '📎 Diğer'}
                              </span>
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${currentStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                currentStatus === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  currentStatus === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                }`}>
                                {currentStatus === 'pending' ? '⏱️ Beklemede' :
                                  currentStatus === 'in_progress' ? '🔄 İşleniyor' :
                                    currentStatus === 'resolved' ? '✅ Çözüldü' : '🚫 Kapatıldı'}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                📅 {new Date(request.created_at).toLocaleDateString('tr-TR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {request.user_email && (
                              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                                📧 <span className="font-medium">{request.user_email}</span>
                              </p>
                            )}
                            <div className="bg-[#0d0d12]/80 p-4 rounded-xl border border-gray-700/50">
                              <p className="text-sm font-semibold text-gray-400 mb-2">Kullanıcı Mesajı:</p>
                              <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                                {request.message}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Existing Admin Reply (if any) */}
                        {request.admin_reply && !isReplying && (
                          <div className="mt-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                            <p className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                              ✅ Mevcut Cevabınız:
                            </p>
                            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                              {request.admin_reply}
                            </p>
                          </div>
                        )}

                        {/* Reply Section */}
                        {isReplying && (
                          <div className="mt-4 space-y-4">
                            {/* Status Dropdown */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Durum
                              </label>
                              <select
                                value={currentStatus}
                                onChange={(e) => setReplyStatus({ ...replyStatus, [request.id]: e.target.value })}
                                className="w-full px-4 py-3 bg-[#0d0d12] border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 font-medium"
                              >
                                <option value="pending">Beklemede</option>
                                <option value="in_progress">İşleniyor</option>
                                <option value="resolved">Çözüldü</option>
                                <option value="closed">Kapatıldı</option>
                              </select>
                            </div>

                            {/* Reply Textarea */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Cevabınız
                              </label>
                              <textarea
                                value={currentReply}
                                onChange={(e) => setReplyText({ ...replyText, [request.id]: e.target.value })}
                                placeholder="Kullanıcıya gönderilecek cevabı yazın..."
                                rows={6}
                                className="w-full px-4 py-3.5 bg-[#0d0d12] border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-200 font-medium"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                              <button
                                onClick={async () => {
                                  try {
                                    const payload: any = { id: request.id };
                                    if (currentStatus !== request.status) payload.status = currentStatus;
                                    if (currentReply && currentReply !== request.admin_reply) payload.admin_reply = currentReply;

                                    const response = await fetch('/api/admin/support-requests', {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-admin-password': loginPassword || sessionStorage.getItem('adminPassword') || ''
                                      },
                                      body: JSON.stringify(payload)
                                    });

                                    if (response.ok) {
                                      setReplyingTo(null);
                                      setReplyText({ ...replyText, [request.id]: '' });
                                      fetchSupportRequests();
                                      alert('✅ Cevap gönderildi!');
                                    } else {
                                      alert('❌ Hata oluştu!');
                                    }
                                  } catch (error) {
                                    console.error(error);
                                    alert('❌ Hata oluştu!');
                                  }
                                }}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:scale-[1.02]"
                              >
                                📤 Cevabı Gönder
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText({ ...replyText, [request.id]: request.admin_reply || '' });
                                  setReplyStatus({ ...replyStatus, [request.id]: request.status });
                                }}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
                              >
                                ❌ İptal
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Reply Button */}
                        {!isReplying && (
                          <button
                            onClick={() => {
                              setReplyingTo(request.id);
                              setReplyText({ ...(replyText), [request.id]: request.admin_reply || '' });
                              setReplyStatus({ ...replyStatus, [request.id]: request.status });
                            }}
                            className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-md hover:scale-[1.02]"
                          >
                            ✏️ {request.admin_reply ? 'Cevabı Düzenle' : 'Cevap Yaz'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : activeTab === 'blog' ? (
            <>
              {/* Blog Management */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Blog Yazıları</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleMigrateBlogTags}
                    disabled={migratingTags}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                    title="Blog tags migration'ını çalıştır (tags kolonu ekler)"
                  >
                    {migratingTags ? '⏳ Çalışıyor...' : '🔧 Tags Migration'}
                  </button>
                  <button
                    onClick={() => setAddBlogPostOpen(!addBlogPostOpen)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {addBlogPostOpen ? 'İptal' : '+ Yeni Blog Yazısı'}
                  </button>
                </div>
              </div>

              {/* Migration Result */}
              {migrationResult && (
                <div className={`mb-4 p-4 rounded-lg ${migrationResult.success
                  ? 'bg-green-900/30 border border-green-700 text-green-300'
                  : 'bg-red-900/30 border border-red-700 text-red-300'
                  }`}>
                  {migrationResult.message}
                </div>
              )}

              {/* Add Blog Post Form */}
              {addBlogPostOpen && (
                <form onSubmit={handleAddBlogPost} className="bg-[#0f0f0f] rounded-xl border border-gray-900 p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Yeni Blog Yazısı</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Başlık</label>
                      <input
                        type="text"
                        value={addBlogPostForm.title}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, title: e.target.value })}
                        className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">
                        Slug (Boş bırakılırsa otomatik oluşturulur)
                      </label>
                      <input
                        type="text"
                        value={addBlogPostForm.slug}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, slug: e.target.value })}
                        className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Kategori</label>
                      <input
                        type="text"
                        value={addBlogPostForm.category}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, category: e.target.value })}
                        className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Yazar</label>
                      <input
                        type="text"
                        value={addBlogPostForm.author}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, author: e.target.value })}
                        className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Kapak Görseli</label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={addBlogPostForm.coverImage}
                            onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, coverImage: e.target.value })}
                            placeholder="Görsel URL'si veya yükleme yapabilirsiniz"
                            className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="coverImageUpload" className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-sm transition duration-300">
                            Görsel Yükle
                          </label>
                          <input
                            id="coverImageUpload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleCoverImageUpload}
                          />
                        </div>
                      </div>
                      {imageUploading && (
                        <div className="mt-2 text-indigo-300 text-sm flex items-center">
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Görsel yükleniyor...
                        </div>
                      )}
                      {addBlogPostForm.coverImage && (
                        <div className="mt-2">
                          <img
                            src={addBlogPostForm.coverImage.startsWith('/') ? addBlogPostForm.coverImage : addBlogPostForm.coverImage}
                            alt="Kapak görseli önizleme"
                            className="h-24 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1">Yazar Görseli</label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={addBlogPostForm.authorImage}
                            onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, authorImage: e.target.value })}
                            placeholder="Görsel URL'si veya yükleme yapabilirsiniz"
                            className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="authorImageUpload" className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded text-sm transition duration-300">
                            Görsel Yükle
                          </label>
                          <input
                            id="authorImageUpload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAuthorImageUpload}
                          />
                        </div>
                      </div>
                      {authorImageUploading && (
                        <div className="mt-2 text-indigo-300 text-sm flex items-center">
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Görsel yükleniyor...
                        </div>
                      )}
                      {addBlogPostForm.authorImage && (
                        <div className="mt-2">
                          <img
                            src={addBlogPostForm.authorImage.startsWith('/') ? addBlogPostForm.authorImage : addBlogPostForm.authorImage}
                            alt="Yazar görseli önizleme"
                            className="h-12 w-12 object-cover rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Okuma Süresi (dakika) *</label>
                      <input
                        type="number"
                        value={addBlogPostForm.readTime}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, readTime: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Etiketler (Tags)
                        <span className="text-xs text-gray-500 ml-2">(Virgülle ayırın: crypto, bitcoin, trading)</span>
                      </label>
                      <input
                        type="text"
                        value={addBlogPostForm.tags}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, tags: e.target.value })}
                        placeholder="crypto, bitcoin, trading, analysis"
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Etiketler SEO için önemlidir. Google'da arama sonuçlarında görünür.
                      </div>
                    </div>
                    <div className="flex items-center pt-8">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={addBlogPostForm.featured}
                        onChange={(e) => setAddBlogPostForm({ ...addBlogPostForm, featured: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-[#0a0a0a] border-gray-900 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="featured" className="ml-2 text-sm font-medium text-gray-300">Öne Çıkarılan</label>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-white text-sm font-medium mb-1">Özet</label>
                    <ReactQuillWrapper
                      theme="snow"
                      value={addBlogPostForm.excerpt}
                      onChange={(excerpt: string) => setAddBlogPostForm({ ...addBlogPostForm, excerpt })}
                      className="bg-[#1a1a23] text-white rounded"
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link']
                        ],
                      }}
                      style={{ height: '150px', marginBottom: '20px' }}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-white text-sm font-medium mb-1">İçerik</label>
                    <ReactQuillWrapper
                      theme="snow"
                      value={addBlogPostForm.content}
                      onChange={(content: string) => setAddBlogPostForm({ ...addBlogPostForm, content })}
                      className="bg-[#1a1a23] text-white rounded"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'align': [] }],
                          ['link', 'image', 'video'],
                          ['blockquote', 'code-block'],
                          [{ 'script': 'sub' }, { 'script': 'super' }],
                          [{ 'indent': '-1' }, { 'indent': '+1' }],
                          [{ 'table': [] }],
                          ['clean']
                        ],
                      }}
                      style={{ height: '500px', marginBottom: '100px' }}
                    />
                  </div>

                  {addBlogPostMsg && (
                    <div className={`p-2 rounded mb-4 ${addBlogPostMsg.includes("hata") ? "bg-red-500" : "bg-green-500"} text-white`}>
                      {addBlogPostMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={addBlogPostLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded text-sm transition duration-300 disabled:opacity-50"
                  >
                    {addBlogPostLoading ? "Ekleniyor..." : "Blog Yazısını Ekle"}
                  </button>
                </form>
              )}

              {loadingBlogPosts ? (
                <p>Blog yazıları yükleniyor...</p>
              ) : (
                <div>
                  {deleteBlogPostError && (
                    <div className="bg-red-500 text-white p-2 rounded mb-2">{deleteBlogPostError}</div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-[#1a1a23] rounded-lg overflow-hidden">
                      <thead className="bg-[#25252d]">
                        <tr>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            Başlık
                          </th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            Slug
                          </th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            Kategori
                          </th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            Yazar
                          </th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            Tarih
                          </th>
                          <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 tracking-wider">
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#25252d]">
                        {blogPosts.map((post) => (
                          <tr key={post.id}>
                            <td className="py-2 px-4 text-sm text-white">{post.title}</td>
                            <td className="py-2 px-4 text-sm text-white">{post.slug}</td>
                            <td className="py-2 px-4 text-sm text-white">{post.category}</td>
                            <td className="py-2 px-4 text-sm text-white">{post.author}</td>
                            <td className="py-2 px-4 text-sm text-white">
                              {new Date(post.publishedAt).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="py-2 px-4 text-sm space-x-2">
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300"
                              >
                                Görüntüle
                              </a>
                              <a
                                href={`https://search.google.com/search-console?resource_id=sc-domain%3Aalertachart.com&url=${encodeURIComponent(`https://alertachart.com/blog/${post.slug}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300 text-xs"
                                title="Google Search Console'da anlık indexleme iste"
                              >
                                🔍 Index
                              </a>
                              <button
                                onClick={() => handleDeleteBlogPost(post.id)}
                                disabled={deleteBlogPostLoading !== null}
                                className="text-red-400 hover:text-red-300"
                              >
                                {deleteBlogPostLoading === post.id ? "Siliniyor..." : "Sil"}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {blogPosts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-4 px-4 text-center text-sm">
                              Henüz blog yazısı bulunmamaktadır.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
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

