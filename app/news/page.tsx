'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, DollarSign, Clock, ExternalLink, Calendar, User } from 'lucide-react';

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  category: 'crypto' | 'finance';
  source: string;
  publishedAt: string;
  imageUrl?: string;
  url?: string;
  author?: string;
}

export default function NewsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'finance'>('all');
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as 'tr' | 'en' | null;
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }
  }, []);

  // Fetch news articles from API
  useEffect(() => {
    setLoading(true);
    const fetchNews = async () => {
      try {
        const categoryParam = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`;
        const response = await fetch(`/api/news${categoryParam}`);
        const data = await response.json();
        if (response.ok) {
          setArticles(data.articles || []);
        }
      } catch (error) {
        console.error('[News] Error fetching news:', error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, [selectedCategory, language]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return language === 'tr' ? 'Az önce' : 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return language === 'tr' ? `${minutes} dk önce` : `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return language === 'tr' ? `${hours} sa önce` : `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return language === 'tr' ? `${days} gün önce` : `${days}d ago`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const otherArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-900 bg-[#0a0a0a] sticky top-0 z-50 backdrop-blur-sm bg-[#0a0a0a]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-[#0f0f0f]"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {language === 'tr' ? 'Haberler' : 'News'}
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  {language === 'tr' ? 'Kripto ve Finans haberleri' : 'Crypto and Finance News'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#151515] hover:text-white border border-gray-900'
            }`}
          >
            {language === 'tr' ? 'Tümü' : 'All'}
          </button>
          <button
            onClick={() => setSelectedCategory('crypto')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === 'crypto'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#151515] hover:text-white border border-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {language === 'tr' ? 'Kripto' : 'Crypto'}
          </button>
          <button
            onClick={() => setSelectedCategory('finance')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === 'finance'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#151515] hover:text-white border border-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            {language === 'tr' ? 'Finans' : 'Finance'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="space-y-8">
            {/* Featured Skeleton */}
            <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 p-8 animate-pulse">
              <div className="h-8 bg-[#151515] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[#151515] rounded w-full mb-2"></div>
              <div className="h-4 bg-[#151515] rounded w-5/6"></div>
            </div>
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-[#0f0f0f] rounded-xl border border-gray-900 p-6 animate-pulse">
                  <div className="h-4 bg-[#151515] rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-[#151515] rounded w-full mb-2"></div>
                  <div className="h-3 bg-[#151515] rounded w-5/6"></div>
                </div>
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
              {language === 'tr' ? 'Bu kategoride haber bulunamadı' : 'No articles found in this category'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Article */}
            {featuredArticle && (
              <article className="group cursor-pointer" onClick={() => featuredArticle.url && window.open(featuredArticle.url, '_blank')}>
                <div className="bg-[#0f0f0f] rounded-2xl border border-gray-900 overflow-hidden hover:border-gray-800 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="p-8 lg:p-12">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                        featuredArticle.category === 'crypto'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}>
                        {featuredArticle.category === 'crypto' 
                          ? (language === 'tr' ? 'Kripto' : 'Crypto')
                          : (language === 'tr' ? 'Finans' : 'Finance')
                        }
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredArticle.publishedAt)}
                      </span>
                    </div>
                    
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors leading-tight">
                      {featuredArticle.title}
                    </h1>
                    
                    <p className="text-lg text-gray-300 mb-6 leading-relaxed line-clamp-3">
                      {featuredArticle.summary}
                    </p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-900">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{featuredArticle.source}</span>
                        </div>
                        {featuredArticle.author && (
                          <>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{featuredArticle.author}</span>
                            </div>
                          </>
                        )}
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTimeAgo(featuredArticle.publishedAt)}
                        </span>
                      </div>
                      {featuredArticle.url && (
                        <a
                          href={featuredArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 font-medium"
                        >
                          {language === 'tr' ? 'Devamını Oku' : 'Read More'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Other Articles Grid */}
            {otherArticles.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">
                  {language === 'tr' ? 'Diğer Haberler' : 'More News'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherArticles.map((article) => (
                    <article
                      key={article.id}
                      className="bg-[#0f0f0f] rounded-xl border border-gray-900 overflow-hidden hover:border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group cursor-pointer"
                      onClick={() => article.url && window.open(article.url, '_blank')}
                    >
                      <div className="p-6">
                        {/* Category Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            article.category === 'crypto'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-green-500/20 text-green-300 border border-green-500/30'
                          }`}>
                            {article.category === 'crypto' 
                              ? (language === 'tr' ? 'Kripto' : 'Crypto')
                              : (language === 'tr' ? 'Finans' : 'Finance')
                            }
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(article.publishedAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors leading-snug">
                          {article.title}
                        </h2>

                        {/* Summary */}
                        <p className="text-sm text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-900">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{article.source}</span>
                            {article.author && (
                              <>
                                <span className="text-gray-600">•</span>
                                <span>{article.author}</span>
                              </>
                            )}
                          </div>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-medium"
                            >
                              {language === 'tr' ? 'Oku' : 'Read'}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
