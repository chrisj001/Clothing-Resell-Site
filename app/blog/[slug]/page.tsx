"use client";

import React, { use, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { sanitizeHtml } from "../../../lib/sanitize";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error || !data) {
        router.push('/blog');
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    fetchPost();
  }, [slug, router]);

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading article...</div>;
  if (!post) return null;

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/blog" style={{ color: '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontWeight: 500 }}>
        &larr; Back to Journal
      </Link>

      <article>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{ color: '#008080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <h1 style={{ fontSize: '3rem', color: '#0f172a', lineHeight: 1.2, marginBottom: '2rem' }}>{post.title}</h1>
          
          {post.image_url && (
            <img 
              src={post.image_url} 
              alt={post.title} 
              style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
            />
          )}
        </header>

        <div 
          style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#334155' }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content.replace(/\n/g, '<br/>')) }} 
        />
      </article>

      <div style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0f172a' }}>Shop the latest drops</h3>
        <Link href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Explore Collection
        </Link>
      </div>
    </div>
  );
}
