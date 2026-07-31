"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";

type Tab = "users" | "pics" | "products";

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("users");
  
  const [users, setUsers] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAdmin = async () => {
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
      
      // Fetch Fit Pics
      const { data: picsData } = await supabase
        .from('fit_pics')
        .select(`
          id,
          user_id,
          image_url,
          caption,
          status,
          created_at,
          profiles:user_id(id, full_name, role)
        `)
        .order('created_at', { ascending: false });
        
      if (picsData) setPics(picsData);

      // Fetch Pending Products
      const { data: pendingData } = await supabase
        .from('products')
        .select('*, profiles!products_seller_id_fkey(id, full_name)') // Using !foreign_key might fail if not named exactly, let's just use seller_id assuming it maps to profiles
        .eq('status', 'pending');
        
      if (pendingData) setPendingProducts(pendingData);

      // Fetch Users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersData) setUsers(usersData);

      setLoading(false);
    };
    fetchAdmin();
  }, [router]);

  const handlePicAction = async (picId: string, userId: string, action: 'approved' | 'rejected') => {
    const { error } = await supabase.from('fit_pics').update({ status: action }).eq('id', picId);
    if (!error) {
      if (action === 'approved') {
        const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', userId).single();
        if (profile) {
          // The database trigger will automatically handle lifetime points and tier updates!
          await supabase.from('profiles').update({ loyalty_points: (profile.loyalty_points || 0) + 500 }).eq('id', userId);
        }
      }
      setPics(pics.map(p => p.id === picId ? { ...p, status: action } : p));
      alert(`Fit pic ${action}!`);
    } else {
      alert("Error updating fit pic: " + error.message);
    }
  };

  const handleAddPoints = async (userId: string, currentPoints: number) => {
    const addPointsStr = prompt(`Enter points to ADD to this user's balance:`, "500");
    if (addPointsStr === null) return;
    
    const addedPoints = parseInt(addPointsStr, 10);
    if (isNaN(addedPoints)) {
      alert("Please enter a valid number.");
      return;
    }

    const newPoints = currentPoints + addedPoints;
    const { error } = await supabase.from('profiles').update({ loyalty_points: newPoints }).eq('id', userId);
    if (error) {
      alert("Failed to update points: " + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, loyalty_points: newPoints } : u));
      alert("Points updated! The database trigger will adjust their tier automatically.");
      window.location.reload();
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const confirmAction = confirm(`Are you sure you want to ${newStatus === 'banned' ? 'BAN' : 'UNBAN'} this user?`);
    
    if (!confirmAction) return;

    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      alert(`User has been ${newStatus}.`);
    }
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'Gold') return <span style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold' }}>★ Gold</span>;
    if (tier === 'Silver') return <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold' }}>★ Silver</span>;
    return <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold' }}>Bronze</span>;
  };

  const handleToggleSeller = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('profiles').update({ is_seller: newStatus }).eq('id', userId);
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_seller: newStatus } : u));
      alert(`User is now ${newStatus ? 'a Seller' : 'not a Seller'}.`);
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleProductAction = async (productId: string, action: 'available' | 'rejected', isDropItem: boolean = false) => {
    const { error } = await supabase.from('products').update({ status: action, is_drop_item: isDropItem }).eq('id', productId);
    if (!error) {
      setPendingProducts(pendingProducts.filter(p => p.id !== productId));
      alert(`Product ${action}${isDropItem ? ' as a Drop Item' : ''}!`);
    } else {
      alert("Error: " + error.message);
    }
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
            <a href="/admin/abandoned-carts">Abandoned Carts</a>
            <a href="/admin/users" className={dashboardStyles.activeLink}>User Management</a>
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
            <h1>User Management</h1>
            <p>Manage customers, loyalty points, bans, and community fit pics.</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('users')}
              style={{
                background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'users' ? '#0f172a' : '#64748b',
                borderBottom: activeTab === 'users' ? '2px solid #0f172a' : 'none',
                marginBottom: '-0.6rem', paddingBottom: '0.5rem'
              }}
            >
              Manage Users
            </button>
            <button 
              onClick={() => setActiveTab('pics')}
              style={{
                background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'pics' ? '#0f172a' : '#64748b',
                borderBottom: activeTab === 'pics' ? '2px solid #0f172a' : 'none',
                marginBottom: '-0.6rem', paddingBottom: '0.5rem'
              }}
            >
              Review Fit Pics
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              style={{
                background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === 'products' ? '#0f172a' : '#64748b',
                borderBottom: activeTab === 'products' ? '2px solid #0f172a' : 'none',
                marginBottom: '-0.6rem', paddingBottom: '0.5rem'
              }}
            >
              Review Products
            </button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            {activeTab === 'users' && (
              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Tier</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Points (Loyalty / Lifetime)</th>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>
                          {user.full_name || 'Unnamed User'}
                          {user.role === 'admin' && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Admin</span>}
                          {user.is_seller && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Seller</span>}
                        </td>
                        <td style={{ padding: '1rem' }}>{getTierBadge(user.tier)}</td>
                        <td style={{ padding: '1rem', color: '#475569' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.loyalty_points || 0}</span> / {user.lifetime_points || 0}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold',
                            backgroundColor: user.status === 'banned' ? '#fecaca' : '#dcfce3',
                            color: user.status === 'banned' ? '#991b1b' : '#166534'
                          }}>
                            {user.status === 'banned' ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handleToggleSeller(user.id, user.is_seller || false)}
                            className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            {user.is_seller ? 'Remove Seller' : 'Make Seller'}
                          </button>
                          <button 
                            onClick={() => handleAddPoints(user.id, user.loyalty_points || 0)}
                            className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Add Points
                          </button>
                          <button 
                            onClick={() => handleToggleBan(user.id, user.status)}
                            className="btn-primary" 
                            style={{ 
                              padding: '0.4rem 0.8rem', fontSize: '0.85rem', border: 'none',
                              backgroundColor: user.status === 'banned' ? '#10b981' : '#ef4444',
                              color: 'white'
                            }}
                          >
                            {user.status === 'banned' ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'pics' && (
              pics.length === 0 ? (
                <div style={{ padding: '3rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Submissions Yet</h2>
                  <p style={{ color: '#475569' }}>When customers submit fit pics, they'll appear here for your review.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {pics.map(pic => (
                    <div key={pic.id} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', marginBottom: '1rem', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={pic.image_url} alt="Fit pic" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{pic.profiles?.full_name || 'Guest User'}</div>
                        <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{new Date(pic.created_at).toLocaleString()}</div>
                        {pic.caption && <p style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem' }}>"{pic.caption}"</p>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {pic.status === 'pending' ? (
                          <>
                            <button onClick={() => handlePicAction(pic.id, pic.user_id, 'approved')} className="btn-primary" style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none' }}>Approve (+500 pts)</button>
                            <button onClick={() => handlePicAction(pic.id, pic.user_id, 'rejected')} className="btn-secondary" style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none' }}>Reject</button>
                          </>
                        ) : (
                          <div style={{ width: '100%', textAlign: 'center', padding: '0.5rem', backgroundColor: pic.status === 'approved' ? '#ecfdf5' : '#fef2f2', color: pic.status === 'approved' ? '#059669' : '#dc2626', fontWeight: 600, borderRadius: '4px', border: `1px solid ${pic.status === 'approved' ? '#a7f3d0' : '#fecaca'}` }}>
                            {pic.status.charAt(0).toUpperCase() + pic.status.slice(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            
            {activeTab === 'products' && (
              pendingProducts.length === 0 ? (
                <div style={{ padding: '3rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                  <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Pending Products</h2>
                  <p style={{ color: '#475569' }}>When sellers submit products, they'll appear here for your review.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {pendingProducts.map(product => (
                    <div key={product.id} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: '100%', paddingTop: '100%', position: 'relative', marginBottom: '1rem', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Image</div>
                        )}
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{product.title}</div>
                        <div style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.5rem' }}>£{product.price?.toFixed(2)}</div>
                        <p style={{ margin: 0, color: '#1e293b', fontSize: '0.85rem' }}>{product.description}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handleProductAction(product.id, 'available')} className="btn-primary" style={{ flex: '1 1 100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.4rem', fontSize: '0.85rem' }}>Approve</button>
                        <button onClick={() => handleProductAction(product.id, 'available', true)} className="btn-primary" style={{ flex: '1 1 100%', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.4rem', fontSize: '0.85rem' }}>Approve for Next Drop</button>
                        <button onClick={() => handleProductAction(product.id, 'rejected')} className="btn-secondary" style={{ flex: '1 1 100%', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem', fontSize: '0.85rem' }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
