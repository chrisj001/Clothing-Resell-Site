"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function BlogFeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('title, slug, image_url, created_at, content')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading articles...</div>;

  return (
    <div className="container" style={{ padding: '4rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#0f172a' }}>The Journal</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Stories, guides, and history from the world of vintage fashion.</p>
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'white', borderRadius: '8px', color: '#64748b' }}>
          Check back soon for our first article!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s',
                height: '100%', display: 'flex', flexDirection: 'column'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {post.image_url ? (
                  <div style={{ width: '100%', height: '200px', backgroundImage: `url(${post.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                ) : (
                  <div style={{ width: '100%', height: '200px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Image</div>
                )}
                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#008080', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a', lineHeight: 1.3 }}>{post.title}</h2>
                  <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1 }}>
                    {post.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}...
                  </p>
                  <div style={{ color: '#008080', fontWeight: 600, fontSize: '0.9rem' }}>Read Article &rarr;</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
