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
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Support requests state
  const [activeTab, setActiveTab] = useState<'broadcast' | 'support' | 'news' | 'blog'>('broadcast');
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  
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
    featured: false
  });
  const [addBlogPostMsg, setAddBlogPostMsg] = useState('');
  const [addBlogPostLoading, setAddBlogPostLoading] = useState(false);
  const [deleteBlogPostLoading, setDeleteBlogPostLoading] = useState<string | null>(null);
  const [deleteBlogPostError, setDeleteBlogPostError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [authorImageUploading, setAuthorImageUploading] = useState(false);

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
        featured: false
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'broadcast'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📢 Bildirim Gönder
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'news'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📰 Haber Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'blog'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📝 Blog Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'support'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💬 Destek Talepleri
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
          {activeTab === 'broadcast' ? (
            <>
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
            </>
          ) : activeTab === 'support' ? (
            <>
              {/* Support Requests Tab */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Destek Talepleri</h2>
                <button
                  onClick={fetchSupportRequests}
                  disabled={loadingSupport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  {loadingSupport ? 'Yükleniyor...' : '🔄 Yenile'}
                </button>
              </div>

              {loadingSupport ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Yükleniyor...</p>
                </div>
              ) : supportRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Henüz destek talebi yok</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {supportRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                              {request.topic === 'general' ? 'Genel' :
                               request.topic === 'technical' ? 'Teknik' :
                               request.topic === 'billing' ? 'Ödeme' :
                               request.topic === 'feature' ? 'Özellik' :
                               request.topic === 'bug' ? 'Hata' : 'Diğer'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded ${
                              request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              request.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              request.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {request.status === 'pending' ? 'Beklemede' :
                               request.status === 'in_progress' ? 'İşleniyor' :
                               request.status === 'resolved' ? 'Çözüldü' : 'Kapatıldı'}
                            </span>
                          </div>
                          {request.user_email && (
                            <p className="text-sm text-gray-400 mb-1">
                              📧 {request.user_email}
                            </p>
                          )}
                          <p className="text-white text-sm whitespace-pre-wrap">
                            {request.message}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 ml-4">
                          {new Date(request.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {request.admin_notes && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Admin Notları:</p>
                          <p className="text-sm text-gray-400">{request.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'blog' ? (
            <>
              {/* Blog Management */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Blog Yazıları</h2>
                <button
                  onClick={() => setAddBlogPostOpen(!addBlogPostOpen)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {addBlogPostOpen ? 'İptal' : '+ Yeni Blog Yazısı'}
                </button>
              </div>

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
                          onChange={(e) => setAddBlogPostForm({...addBlogPostForm, title: e.target.value})}
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
                          onChange={(e) => setAddBlogPostForm({...addBlogPostForm, slug: e.target.value})}
                          className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Kategori</label>
                        <input
                          type="text"
                          value={addBlogPostForm.category}
                          onChange={(e) => setAddBlogPostForm({...addBlogPostForm, category: e.target.value})}
                          className="w-full bg-[#1a1a23] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-1">Yazar</label>
                        <input
                          type="text"
                          value={addBlogPostForm.author}
                          onChange={(e) => setAddBlogPostForm({...addBlogPostForm, author: e.target.value})}
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
                            onChange={(e) => setAddBlogPostForm({...addBlogPostForm, coverImage: e.target.value})}
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
                            onChange={(e) => setAddBlogPostForm({...addBlogPostForm, authorImage: e.target.value})}
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
                        onChange={(e) => setAddBlogPostForm({...addBlogPostForm, readTime: e.target.value})}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-900 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                    <div className="flex items-center pt-8">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={addBlogPostForm.featured}
                        onChange={(e) => setAddBlogPostForm({...addBlogPostForm, featured: e.target.checked})}
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
                      onChange={(excerpt: string) => setAddBlogPostForm({...addBlogPostForm, excerpt})}
                      className="bg-[#1a1a23] text-white rounded"
                      modules={{
                        toolbar: [
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
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
                      onChange={(content: string) => setAddBlogPostForm({...addBlogPostForm, content})}
                      className="bg-[#1a1a23] text-white rounded"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'align': [] }],
                          ['link', 'image', 'video'],
                          ['blockquote', 'code-block'],
                          [{ 'script': 'sub'}, { 'script': 'super' }],
                          [{ 'indent': '-1'}, { 'indent': '+1' }],
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

