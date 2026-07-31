"use client";

import styles from "./dashboard.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../components/DashboardSidebar";

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        // Fetch the user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        } else {
          setProfile({
            full_name: session.user.email?.split('@')[0] || 'User',
            loyalty_points: 0
          });
        }

        // Fetch user's orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', session.user.id)
          .order('created_at', { ascending: false });

        if (ordersData) {
          setOrders(ordersData);
        }

        // Fetch user's notifications
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });
          
        if (notificationsData) {
          setNotifications(notificationsData);
        }
      } catch (err) {
        console.error("Dashboard error", err);
      }
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading your secure dashboard...</h2>
      </div>
    );
  }

  const points = profile?.lifetime_points || profile?.loyalty_points || 0;
  let currentTier = 'Bronze';
  let nextTier = 'Silver';
  let nextThreshold = 1000;
  let progress = 0;
  
  if (points < 1000) {
    currentTier = 'Bronze';
    nextTier = 'Silver';
    nextThreshold = 1000;
    progress = (points / 1000) * 100;
  } else if (points < 5000) {
    currentTier = 'Silver';
    nextTier = 'Gold';
    nextThreshold = 5000;
    progress = ((points - 1000) / 4000) * 100;
  } else {
    currentTier = 'Gold';
    nextTier = 'Max Tier';
    progress = 100;
  }

  const currentTierBg = currentTier === 'Gold' ? '#fef08a' : (currentTier === 'Silver' ? '#f1f5f9' : '#ffedd5');
  const currentTierText = currentTier === 'Gold' ? '#854d0e' : (currentTier === 'Silver' ? '#334155' : '#9a3412');
  const currentTierBorder = currentTier === 'Gold' ? '#facc15' : (currentTier === 'Silver' ? '#cbd5e1' : '#fdba74');

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="overview" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Welcome back, {profile?.full_name || 'Customer'}</h1>
            <p>Here's what's happening with your CJThreads account.</p>
          </div>
          
          {/* Notifications Center */}
          {notifications.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>Notifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ padding: '1.5rem', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#065f46', fontSize: '1.1rem' }}>{notif.title}</h3>
                      <p style={{ margin: 0, color: '#047857' }}>{notif.message}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                        setNotifications(notifications.filter(n => n.id !== notif.id));
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', fontWeight: 600 }}
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{ backgroundColor: currentTierBg, border: `1px solid ${currentTierBorder}` }}>
              <div className={styles.statValue} style={{ color: currentTierText }}>{points}</div>
              <div className={styles.statLabel} style={{ color: currentTierText, opacity: 0.8 }}>Lifetime Loyalty Points</div>
              
              {/* Gamification Progress */}
              <div style={{ marginTop: '1rem', width: '100%' }}>
                {(() => {
                  return (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: currentTierText, fontWeight: 500 }}>
                        <span><strong>{currentTier}</strong> Tier</span>
                        {nextTier !== 'Max Tier' && <span>{nextThreshold - points} pts to {nextTier}</span>}
                      </div>
                      <div style={{ width: '100%', backgroundColor: currentTierBorder, borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${Math.min(100, Math.max(0, progress))}%`, 
                          backgroundColor: currentTier === 'Bronze' ? '#f59e0b' : currentTier === 'Silver' ? '#3b82f6' : '#eab308', 
                          height: '100%', 
                          transition: 'width 0.5s ease-in-out' 
                        }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className={styles.statCard} style={{ backgroundColor: currentTierBg, border: `1px solid ${currentTierBorder}` }}>
              <div className={styles.statValue} style={{ color: currentTierText }}>{orders.length}</div>
              <div className={styles.statLabel} style={{ color: currentTierText, opacity: 0.8 }}>Active Orders</div>
            </div>
          </div>

          <h2>Recent Orders</h2>
          {orders.length === 0 ? (
            <div style={{ padding: '3rem', backgroundColor: '#cbd5e1', borderRadius: '8px', textAlign: 'center', border: '1px dashed #94a3b8' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Orders Yet</h3>
              <p style={{ color: '#475569' }}>You haven't placed any orders yet. Start shopping!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => (
                <div key={order.id} style={{ padding: '1.5rem', backgroundColor: '#cbd5e1', borderRadius: '8px', border: '1px solid #94a3b8', color: '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <strong>Order #{order.order_number || order.id.split('-')[0]}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>£{order.total_amount.toFixed(2)}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#475569', textTransform: 'capitalize' }}>Status: {order.status}</div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Items</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                      {(order.items || []).map((item: any, idx: number) => (
                        <li key={idx}>
                          {item.quantity}x {item.name} {item.size ? `(Size: ${item.size})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
