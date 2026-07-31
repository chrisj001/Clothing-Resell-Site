"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function ReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferrals = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Get user's profile to get their referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);

      // Get users who signed up with this user's referral code
      if (profile && profile.referral_code) {
        const { data: referredUsers } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .eq('referred_by', profile.referral_code)
          .order('created_at', { ascending: false });
          
        if (referredUsers) {
          setReferrals(referredUsers);
        }
      }

      setLoading(false);
    };
    fetchReferrals();
  }, [router]);

  const referralLink = typeof window !== 'undefined' && userProfile?.referral_code 
    ? `${window.location.origin}/login?mode=signup&ref=${userProfile.referral_code}` 
    : '';

  const copyToClipboard = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="referrals" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Refer & Earn</h1>
            <p>Give your friends 10% off their first order. You'll get 1,000 Loyalty Points for every friend who signs up!</p>
          </div>

          {/* Referral Link Card */}
          <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>Your Unique Referral Link</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="text" 
                readOnly 
                value={referralLink} 
                style={{ flex: 1, padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155', fontWeight: 500, fontSize: '1rem' }}
              />
              <button onClick={copyToClipboard} className="btn-primary" style={{ padding: '1rem 2rem', whiteSpace: 'nowrap' }}>
                {copied ? "Copied! ✓" : "Copy Link"}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎁</div>
                <h3 style={{ color: '#166534', margin: '0 0 0.5rem 0' }}>They get 10% Off</h3>
                <p style={{ color: '#15803d', margin: 0, fontSize: '0.9rem' }}>A welcome discount code will be sent to them automatically.</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '1.5rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                <h3 style={{ color: '#1e40af', margin: '0 0 0.5rem 0' }}>You get 1,000 Points</h3>
                <p style={{ color: '#1d4ed8', margin: 0, fontSize: '0.9rem' }}>Points are credited to your account the moment they join.</p>
              </div>
            </div>
          </div>

          {/* Referrals List */}
          <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Your Referrals ({referrals.length})</h2>
            
            {referrals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', margin: 0 }}>You haven't referred anyone yet. Share your link to start earning!</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {referrals.map((friend) => (
                  <li key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{friend.full_name || 'New Member'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Joined {new Date(friend.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      +1,000 pts <span style={{ fontSize: '1.2rem' }}>🎉</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
