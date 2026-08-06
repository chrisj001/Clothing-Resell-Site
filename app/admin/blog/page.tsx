"use client";

import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminBlogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'admin') return router.push('/dashboard');
      
      fetchPosts();
    };
    checkAdmin();
  }, [router]);

  const fetchPosts = async () => {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Auto-generate slug if we aren't editing an existing one
    if (!editingId) {
      setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      if (editingId) {
        const { error } = await supabase
          .from('blog_posts')
          .update({ title, slug, content, image_url: imageUrl, published, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setMessage("Post updated successfully!");
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert({ title, slug, content, image_url: imageUrl, published });
        if (error) throw error;
        setMessage("Post created successfully!");
      }
      
      fetchPosts();
      setTimeout(() => {
        resetForm();
      }, 1500);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const editPost = (post: any) => {
    setIsEditing(true);
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setImageUrl(post.image_url || "");
    setPublished(post.published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    fetchPosts();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle("");
    setSlug("");
    setContent("");
    setImageUrl("");
    setPublished(false);
    setMessage("");
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={dashboardStyles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/products">My Inventory</a>
            <a href="/admin/orders">All Orders</a>
            <a href="/admin/discounts">Discount Codes</a>
            <a href="/admin/abandoned-carts">Abandoned Carts</a>
            <a href="/admin/blog" className={dashboardStyles.activeLink}>Blog Posts</a>
            <a href="/admin/settings">Store Settings</a>
            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              style={{
                background: 'none', border: 'none', color: 'var(--color-teal-light)',
                padding: '0.75rem 1rem', textAlign: 'left', width: '100%', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 600, marginTop: '1rem', borderRadius: '4px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-teal)'; e.currentTarget.style.color = 'var(--color-white)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-teal-light)'; }}
            >
              Log Out
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className={dashboardStyles.mainContent}>
          <div className={dashboardStyles.header}>
            <h1>Blog Management</h1>
            <p>Write and publish articles to drive SEO traffic.</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{isEditing ? 'Edit Post' : 'Create New Post'}</h2>
              {isEditing && (
                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel Editing
                </button>
              )}
            </div>

            {message && (
              <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px', backgroundColor: message.startsWith('Error') ? '#fee2e2' : '#dcfce3', color: message.startsWith('Error') ? '#b91c1c' : '#166534' }}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Post Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={handleTitleChange} 
                  required 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }} 
                  placeholder="e.g. Top 10 Vintage Finds"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>URL Slug</label>
                  <input 
                    type="text" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Cover Image URL (Optional)</label>
                  <input 
                    type="text" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }} 
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Content (Supports Markdown / HTML)</label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '1rem', borderRadius: '4px', border: '1px solid #d1d5db', minHeight: '300px', fontFamily: 'monospace' }} 
                  placeholder="Write your article here..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="published" 
                  checked={published} 
                  onChange={(e) => setPublished(e.target.checked)} 
                  style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                />
                <label htmlFor="published" style={{ fontWeight: 600, cursor: 'pointer' }}>Publish immediately</label>
              </div>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : (isEditing ? "Update Post" : "Create Post")}
              </button>
            </form>
          </div>

          <h2>Your Posts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {posts.length === 0 ? (
              <p style={{ color: '#64748b' }}>No posts written yet.</p>
            ) : (
              posts.map(post => (
                <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0' }}>{post.title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span style={{ color: post.published ? '#16a34a' : '#ea580c', fontWeight: 600 }}>{post.published ? 'Published' : 'Draft'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => editPost(post)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => deletePost(post.id)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
