"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import styles from "../page.module.css";

export default function CommunityFeed() {
  const [loading, setLoading] = useState(true);
  const [pics, setPics] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchPics = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);

      const { data, error } = await supabase
        .from('fit_pics')
        .select(`
          id,
          image_url,
          caption,
          likes,
          created_at,
          profiles:user_id(id, full_name, role),
          products:product_id(id, title, price, brand)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (data) {
        setPics(data);
      }
      setLoading(false);
    };

    fetchPics();
  }, []);

  const handleLike = async (picId: string, currentLikes: number) => {
    if (!user) {
      alert("You must be logged in to hype this fit!");
      return;
    }
    
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('fit_pic_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('fit_pic_id', picId)
      .maybeSingle();

    if (existingLike) {
      // Unlike
      await supabase.from('fit_pic_likes').delete().eq('id', existingLike.id);
      await supabase.from('fit_pics').update({ likes: currentLikes - 1 }).eq('id', picId);
      setPics(pics.map(p => p.id === picId ? { ...p, likes: currentLikes - 1 } : p));
    } else {
      // Like
      await supabase.from('fit_pic_likes').insert({ user_id: user.id, fit_pic_id: picId });
      await supabase.from('fit_pics').update({ likes: currentLikes + 1 }).eq('id', picId);
      setPics(pics.map(p => p.id === picId ? { ...p, likes: currentLikes + 1 } : p));
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}><h2>Loading Community Feed...</h2></div>;
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#0f172a' }}>Community Fit Pics</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          See how the community is styling their vintage finds. Submit your own fit to earn 500 VIP points!
        </p>
        <Link href="/dashboard/community" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', fontSize: '1.1rem', padding: '0.75rem 1.5rem' }}>
          Submit Your Fit 📸
        </Link>
      </div>

      {pics.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>No fits posted yet!</h2>
          <p style={{ color: '#64748b' }}>Be the first to show off your style.</p>
        </div>
      ) : (
        <div style={{ columns: '1', columnGap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          <style dangerouslySetInnerHTML={{__html: `
            @media (min-width: 640px) { .masonry-grid { columns: 2; } }
            @media (min-width: 1024px) { .masonry-grid { columns: 3; } }
            .masonry-item { break-inside: avoid; margin-bottom: 1.5rem; }
          `}} />
          <div className="masonry-grid">
            {pics.map(pic => (
              <div key={pic.id} className="masonry-item" style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ width: '100%', position: 'relative' }}>
                  <img src={pic.image_url} alt={pic.caption} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                  {pic.products && (
                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                      <Link href={`/products/${pic.products.id}`} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', padding: '0.5rem 0.75rem', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🛍️</div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Shop this look</div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{pic.products.title}</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>@{pic.profiles?.full_name?.split(' ')[0] || 'User'}</div>
                    <button 
                      onClick={() => handleLike(pic.id, pic.likes || 0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontWeight: 600, fontSize: '1rem' }}
                    >
                      🔥 {pic.likes || 0}
                    </button>
                  </div>
                  {pic.caption && <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>{pic.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
