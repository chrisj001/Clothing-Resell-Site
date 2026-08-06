"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";

export default function AbandonedCartsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [carts, setCarts] = useState<any[]>([]);
  const [recovering, setRecovering] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      // Fetch carts that haven't been updated in 1 hour and are still 'active'
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('carts')
        .select(`
          id,
          items,
          last_updated,
          status,
          profiles(id, full_name)
        `)
        .eq('status', 'active')
        .lt('last_updated', oneHourAgo)
        .order('last_updated', { ascending: false });
        
      if (data) {
        // filter out empty carts
        const non_empty_carts = data.filter(c => c.items && c.items.length > 0);
        setCarts(non_empty_carts);
      } else if (error) {
        console.error("Error fetching carts:", error);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const handleSendRecovery = async (cartId: string, userId: string) => {
    setRecovering(cartId);
    
    // Simulate sending email (delay)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Insert in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Complete your purchase! (10% Off)',
        message: 'We noticed you left some items in your cart. Use code COMEBACK10 to get 10% off your entire order!'
      });

    if (notificationError) {
      alert("Error sending notification: " + notificationError.message);
      setRecovering(null);
      return;
    }

    // Update cart status to 'recovered'
    const { error } = await supabase
      .from('carts')
      .update({ status: 'recovered' })
      .eq('id', cartId);
      
    if (!error) {
      alert("Recovery notification sent successfully!");
      setCarts(carts.filter(c => c.id !== cartId));
    } else {
      alert("Error updating cart status: " + error.message);
    }
    setRecovering(null);
  };

  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={dashboardStyles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/analytics">Analytics</a>
            <a href="/admin/products">My Inventory</a>
            <a href="/admin/orders">All Orders</a>
            <a href="/admin/discounts">Discount Codes</a>
            <a href="/admin/abandoned-carts" className={dashboardStyles.activeLink}>Abandoned Carts</a>
            <a href="/admin/users">User Management</a>
            <a href="/admin/settings">Store Settings</a>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-teal-light)',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '1rem',
                borderRadius: '4px'
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
            <h1>Abandoned Carts</h1>
            <p>Recover lost revenue by emailing customers who left items behind.</p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            {carts.length === 0 ? (
              <div style={{ padding: '3rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', border: '1px dashed #d1d5db' }}>
                <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Abandoned Carts</h2>
                <p style={{ color: '#475569' }}>You're all caught up! There are no active carts waiting.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {carts.map(cart => {
                  const total = calculateTotal(cart.items);
                  const customerName = cart.profiles?.full_name || 'Anonymous User';
                  
                  return (
                    <div key={cart.id} style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{customerName}'s Cart</h3>
                          <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                            Last Active: {new Date(cart.last_updated).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>£{total.toFixed(2)}</div>
                          <button 
                            onClick={() => handleSendRecovery(cart.id, cart.profiles.id)}
                            disabled={recovering === cart.id}
                            className="btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', opacity: recovering === cart.id ? 0.7 : 1 }}
                          >
                            {recovering === cart.id ? 'Sending...' : 'Send Recovery Discount'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#475569' }}>Items Left Behind</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {(cart.items || []).map((item: any, idx: number) => (
                            <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.quantity}x {item.name} {item.size ? `(Size: ${item.size})` : ''}</span>
                              <span>£{(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
