"use client";

import styles from "../dashboard.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function LoyaltyDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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
          .select('full_name, loyalty_points, lifetime_points, tier')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error("Loyalty fetch error", err);
      }
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading your loyalty dashboard...</h2>
      </div>
    );
  }

  const currentTier = profile?.tier || 'Bronze';
  const lifetimePoints = profile?.lifetime_points || 0;
  
  let nextTier = 'Silver';
  let pointsNeeded = 1000 - lifetimePoints;
  let progressPercent = (lifetimePoints / 1000) * 100;
  
  if (currentTier === 'Silver') {
    nextTier = 'Gold';
    pointsNeeded = 5000 - lifetimePoints;
    progressPercent = ((lifetimePoints - 1000) / 4000) * 100;
  } else if (currentTier === 'Gold') {
    nextTier = 'Max Tier';
    pointsNeeded = 0;
    progressPercent = 100;
  }

  const currentTierBg = currentTier === 'Gold' ? '#fef08a' : (currentTier === 'Silver' ? '#f1f5f9' : '#ffedd5');
  const currentTierText = currentTier === 'Gold' ? '#854d0e' : (currentTier === 'Silver' ? '#334155' : '#9a3412');
  const currentTierBorder = currentTier === 'Gold' ? '#facc15' : (currentTier === 'Silver' ? '#d1d5db' : '#fdba74');
  const currentTierBadgeBg = currentTier === 'Gold' ? '#fde047' : (currentTier === 'Silver' ? '#e2e8f0' : '#fed7aa');

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="loyalty" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>CJ Threads Rewards</h1>
            <p>Welcome to your VIP loyalty dashboard.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            {/* Current Balance Card */}
            <div style={{ backgroundColor: currentTierBg, color: currentTierText, padding: '2rem', borderRadius: '12px', border: `1px solid ${currentTierBorder}`, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: currentTierText, opacity: 0.8 }}>Redeemable Reward Points</h2>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1px' }}>
                {profile?.loyalty_points || 0}
              </div>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Value: <strong>£{((profile?.loyalty_points || 0) / 100).toFixed(2)}</strong> off your next order.
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                <a href="/" className="btn-primary" style={{ backgroundColor: currentTierText, color: 'white', display: 'inline-block', textDecoration: 'none', border: 'none' }}>
                  Shop & Redeem
                </a>
              </div>
            </div>

            {/* VIP Tier Card */}
            <div style={{ backgroundColor: currentTierBg, padding: '2rem', borderRadius: '12px', border: `1px solid ${currentTierBorder}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, color: currentTierText }}>Your VIP Tier</h2>
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backgroundColor: currentTierBadgeBg,
                  color: currentTierText
                }}>
                  {currentTier} Member
                </div>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem', flex: 1 }}>
                {currentTier === 'Gold' 
                  ? "You have unlocked the highest tier! Enjoy 24hr Early Access to all new vintage drops before anyone else can see them." 
                  : `You are ${pointsNeeded} lifetime points away from unlocking ${nextTier}.`}
              </p>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  <span>{currentTier}</span>
                  <span>{nextTier}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%`, height: '100%', backgroundColor: 'var(--color-teal)', transition: 'width 1s ease-out' }}></div>
                </div>
                <div style={{ fontSize: '0.85rem', color: currentTierText, marginTop: '1rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.4)', padding: '0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                  Lifetime Points: {lifetimePoints}
                  <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>
                    (These never go down and control your VIP tier)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#d1d5db', padding: '2.5rem', borderRadius: '12px', border: '1px solid #94a3b8' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0f172a' }}>How to Earn Points</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '2rem' }}>🛍️</div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#334155' }}>Make a Purchase</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Earn 10 points for every £1 you spend on the site.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '2rem' }}>✍️</div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#334155' }}>Leave a Review</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Earn 50 points every time you review an item you've purchased.</p>
                </div>
              </div>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', color: '#0f172a' }}>Tier Benefits</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#ffedd5', borderRadius: '8px', border: '1px solid #fdba74' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#c2410c' }}></span>
                      Bronze Tier
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>0 - 999 Points</span>
                </div>
                <ul style={{ margin: '1rem 0 0 0', paddingLeft: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
                  <li>Redeem points for cash discounts at checkout</li>
                </ul>
              </div>
                            <div style={{ padding: '1.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
                      Silver Tier
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>1,000 - 4,999 Points</span>
                </div>
                <ul style={{ margin: '1rem 0 0 0', paddingLeft: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
                  <li>Redeem points for cash discounts at checkout</li>
                  <li>Occasional free shipping codes emailed to you</li>
                </ul>
              </div>
                            <div style={{ padding: '1.5rem', backgroundColor: '#fef08a', borderRadius: '8px', border: '1px solid #facc15' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ca8a04' }}></span>
                      Gold Tier
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>5,000+ Points</span>
                </div>
                <ul style={{ margin: '1rem 0 0 0', paddingLeft: '1.5rem', color: '#475569', fontSize: '0.95rem' }}>
                  <li>Redeem points for cash discounts at checkout</li>
                  <li><strong>24-Hour Early Access</strong> to all new vintage drops</li>
                  <li>VIP priority support</li>
                </ul>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
