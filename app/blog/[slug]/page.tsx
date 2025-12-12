"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import DOMPurify from 'isomorphic-dompurify';

// Interface for blog posts
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  author: string;
  authorImage?: string;
  readTime: number;
  publishedAt: string;
  featured: boolean;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    async function fetchBlogPost() {
      if (!slug) return;
      
      try {
        // Fetch blog post
        const response = await fetch(`/api/blog/${slug}`);
        const data = await response.json();
        setPost(data);
        
        // Fetch related posts of the same category
        const relatedResponse = await fetch(`/api/blog?category=${data.category}&limit=3&exclude=${data.id}`);
        const relatedData = await relatedResponse.json();
        setRelatedPosts(relatedData);
      } catch (error) {
        console.error("Blog yazısı yüklenirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBlogPost();
  }, [slug]);

  // Format date function
  function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    });
  }

  if (isLoading) {
    return (
      <div className="bg-[#0C0C0D] text-white">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16">
          <div className="w-full h-64 bg-zinc-900 rounded-xl animate-pulse mb-6"></div>
          <div className="w-3/4 h-10 bg-zinc-900 animate-pulse mb-4"></div>
          <div className="w-1/2 h-6 bg-zinc-900 animate-pulse mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full h-4 bg-zinc-900 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[#0C0C0D] text-white">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Blog yazısı bulunamadı</h1>
          <p className="text-zinc-400 mb-6">Aradığınız blog yazısı bulunamadı veya kaldırılmış olabilir.</p>
          <Link href="/blog" className="text-indigo-400 hover:text-indigo-300">
            Blog ana sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0C0C0D] text-white w-full h-full">
      <main className="pt-12">
        <article className="w-full max-w-3xl mx-auto px-4 sm:px-6">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 text-sm text-zinc-400 mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-zinc-300 truncate">{post.title}</span>
          </div>
          
          {/* Post Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300 mb-4">
              {post.category}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
              {post.title}
            </h1>
            {/* Post Excerpt */}
            <div className="text-lg text-zinc-300 mb-6" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.excerpt) }} />
            <div className="flex items-center mb-8">
              <div className="flex-shrink-0 mr-4">
                {post.authorImage ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <Image 
                      src={post.authorImage} 
                      alt={post.author}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {post.author?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-white">{post.author}</p>
                <p className="text-sm text-zinc-400">
                  {formatDate(post.publishedAt)} · {post.readTime} dk okuma
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Featured Image */}
          {post.coverImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative w-full h-[400px] rounded-xl overflow-hidden mb-10"
            >
              <Image 
                src={post.coverImage} 
                alt={post.title}
                fill
                className="object-cover"
              />
            </motion.div>
          )}
          
          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
          />
        </article>
        
        {/* Related Posts Section */}
        {relatedPosts.length > 0 && (
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-16 pt-16 border-t border-zinc-800">
            <h2 className="text-2xl font-bold mb-8">İlgili Yazılar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map(relatedPost => (
                <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                  <div className="group bg-zinc-900 rounded-xl overflow-hidden hover:bg-zinc-800 transition-colors">
                    <div className="relative h-40 w-full overflow-hidden">
                      {relatedPost.coverImage ? (
                        <Image 
                          src={relatedPost.coverImage} 
                          alt={relatedPost.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700"></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300">
                          {relatedPost.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link 
                href="/blog"
                className="inline-flex items-center px-6 py-3 border border-zinc-700 rounded-full text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Tüm blog yazılarını gör
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
