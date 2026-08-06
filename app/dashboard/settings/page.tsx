"use client";

import styles from "../dashboard.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function CustomerSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setEmail(session.user.email || "");
        }
      } catch (err) {
        console.error("Settings fetch error", err);
      }
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!currentPassword || !newPassword) {
      setMessage("Please enter both your current and new password.");
      setSaving(false);
      return;
    }

    try {
      // 1. Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading your secure dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="settings" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Account Settings</h1>
            <p>Update your personal information and preferences.</p>
          </div>

          <div style={{ maxWidth: '600px', backgroundColor: '#d1d5db', padding: '2rem', borderRadius: '8px', border: '1px solid #94a3b8', color: '#1e293b' }}>
            {message && (
              <div style={{ padding: '1rem', backgroundColor: message.includes('Error') ? '#fee2e2' : '#dcfce3', color: message.includes('Error') ? '#b91c1c' : '#166534', borderRadius: '4px', marginBottom: '1.5rem' }}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>Account ID</label>
                <input 
                  type="text" 
                  value={profile?.id || ''}
                  disabled
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '1rem', backgroundColor: '#f8fafc', color: '#94a3b8' }}
                />
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>This is your unique customer identifier.</p>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={saving}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
