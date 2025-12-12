"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import DOMPurify from 'isomorphic-dompurify';

// Blog post interface for TypeScript
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
  tags?: string[];
}

export default function BlogPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBlogPosts() {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json() as BlogPost[];
        
        // Set featured post (first one with featured flag)
        const featured = data.find((post: BlogPost) => post.featured) || data[0];
        setFeaturedPost(featured);
        
        // Set remaining blog posts
        setBlogPosts(data.filter((post: BlogPost) => post.id !== featured?.id));
      } catch (error) {
        console.error("Blog yüklenirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBlogPosts();
  }, []);

  // Format date function
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    // return a Turkish format date: 15 May 2025
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    });
  }

  // Animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-[#0C0C0D] text-white w-full h-full">
      <main className="pt-12">
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Blog</h1>
            <p className="text-base text-zinc-400 max-w-2xl mx-auto">
              Kripto para ve blockchain teknolojileri hakkında en güncel içerikler, analizler ve eğitim materyalleri.
            </p>
          </motion.div>
          
          {/* Featured Post */}
          {isLoading ? (
            <div className="w-full h-96 bg-zinc-900 rounded-xl animate-pulse"></div>
          ) : featuredPost ? (
            <Link href={`/blog/${featuredPost.slug}`}>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group relative w-full h-[500px] rounded-xl overflow-hidden"
              >
                {featuredPost.coverImage ? (
                  <Image 
                    src={featuredPost.coverImage} 
                    alt={featuredPost.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300 mb-3">
                    {featuredPost.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-indigo-300 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-zinc-300 text-sm md:text-base line-clamp-2 mb-4" 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(featuredPost.excerpt) }}
                  />
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {featuredPost.authorImage ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <Image 
                            src={featuredPost.authorImage} 
                            alt={featuredPost.author}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {featuredPost.author.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{featuredPost.author}</p>
                      <p className="text-xs text-zinc-400">
                        {formatDate(featuredPost.publishedAt)} · {featuredPost.readTime} dk okuma
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ) : (
            <div className="w-full p-6 rounded-xl bg-zinc-900 text-center">
              <p>Henüz blog yazısı bulunmamaktadır.</p>
            </div>
          )}
        </section>
        
        {/* Blog Posts Grid */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {isLoading ? (
              // Loading skeletons
              Array(6).fill(null).map((_, i) => (
                <motion.div 
                  key={i} 
                  variants={item}
                  className="bg-zinc-900 rounded-xl overflow-hidden h-[400px] animate-pulse"
                ></motion.div>
              ))
            ) : blogPosts.length > 0 ? (
              blogPosts.map(post => (
                <motion.div
                  key={post.id}
                  variants={item}
                  className="group bg-zinc-900 rounded-xl overflow-hidden flex flex-col h-full hover:bg-zinc-800 transition-colors"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="relative h-48 w-full overflow-hidden">
                      {post.coverImage ? (
                        <Image 
                          src={post.coverImage} 
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700"></div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-grow">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-2 mb-3"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.excerpt) }}
                      />
                    </div>
                    <div className="px-6 pb-6 mt-auto">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          {post.authorImage ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              <Image 
                                src={post.authorImage} 
                                alt={post.author}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {post.author.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{post.author}</p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(post.publishedAt)} · {post.readTime} dk
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full p-6 rounded-xl bg-zinc-900 text-center">
                <p>Henüz başka blog yazısı bulunmamaktadır.</p>
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
