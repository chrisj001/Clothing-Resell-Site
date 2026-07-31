"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";
import Link from "next/link";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function DashboardCommunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUploading(true);

    let finalImageUrl = imageUrl;

    // Handle File Upload to Supabase Storage if file is provided
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Security Error: Only image files are allowed.");
        setUploading(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Security Error: Image file must be under 5MB.");
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fit-pics')
        .upload(filePath, file);

      if (uploadError) {
        alert("Error uploading file: " + uploadError.message);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('fit-pics')
        .getPublicUrl(filePath);
        
      finalImageUrl = publicUrl;
    }

    if (!finalImageUrl) {
      alert("Please provide an image URL or upload a file.");
      setUploading(false);
      return;
    }

    const { error } = await supabase
      .from('fit_pics')
      .insert({
        user_id: user.id,
        image_url: finalImageUrl,
        caption: caption,
        status: 'pending' // Admin must approve
      });

    if (error) {
      alert("Error submitting fit pic: " + error.message);
    } else {
      setSuccess(true);
      setImageUrl("");
      setFile(null);
      setCaption("");
    }
    setUploading(false);
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="community" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#0f172a' }}>Submit Your Fit 📸</h1>
              <p>Show off your style on the Community Feed and earn 500 Loyalty Points when approved!</p>
            </div>
            <Link href="/community" className="btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none' }}>
              View Public Feed
            </Link>
          </div>

          <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Fit Submitted!</h2>
                <p style={{ color: '#475569', marginBottom: '1.5rem' }}>Your fit is in the queue for review. Once approved, you'll earn 500 points!</p>
                <button className="btn-primary" onClick={() => setSuccess(false)}>Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>Upload Photo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>or paste an image URL below if you prefer.</p>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>Image URL (Optional)</label>
                  <input 
                    type="url" 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/my-fit.jpg" 
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>Caption</label>
                  <textarea 
                    value={caption} 
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Tell us about this look..." 
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                    required
                  />
                </div>

                <button type="submit" disabled={uploading} className="btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>
                  {uploading ? 'Submitting...' : 'Submit for 500 Points'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
