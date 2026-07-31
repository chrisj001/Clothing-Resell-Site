"use client";

import styles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

const ProductTimer = ({ createdAt }: { createdAt: string }) => {
  const [timeText, setTimeText] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const created = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diff = now - created;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (diff < twentyFourHours) {
        // Countdown remaining until 24h
        const remaining = twentyFourHours - diff;
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeText(`${h}h ${m}m ${s}s remaining`);
      } else {
        // Count up total time on site
        const days = Math.floor(diff / twentyFourHours);
        const h = Math.floor((diff % twentyFourHours) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeText(`${days}d ${h}h ${m}m on site`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 500 }}>{timeText}</div>;
};

export default function AdminInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'sellers'>('mine');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData && profileData.role === 'admin') {
        setProfile(profileData);
        
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (productsData) {
          setProducts(productsData);
        }

        const { data: sellerProductsData } = await supabase
          .from('products')
          .select('*, profiles:seller_id (id, full_name, tier)')
          .neq('seller_id', session.user.id)
          .order('created_at', { ascending: false });

        if (sellerProductsData) {
          setSellerProducts(sellerProductsData);
        }
        
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    };

    checkAdmin();
  }, [router]);

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this product?")) return;

    try {
      if (imageUrl) {
        const filePath = imageUrl.split('product-images/public/')[1];
        if (filePath) {
          await supabase.storage.from('product-images').remove([`public/${filePath}`]);
        }
      }

      const { error: dbError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setProducts(products.filter(p => p.id !== id));
      
    } catch (err: any) {
      alert("Failed to delete product: " + err.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'sold') {
      if (!window.confirm("Are you sure you want to relist this item?")) return;
      
      try {
        const { error } = await supabase
          .from('products')
          .update({ status: 'available' })
          .eq('id', id);
          
        if (error) throw error;
        
        setProducts(products.map(p => p.id === id ? { ...p, status: 'available' } : p));
        setSellerProducts(sellerProducts.map(p => p.id === id ? { ...p, status: 'available' } : p));
      } catch (err: any) {
        alert("Failed to relist product: " + err.message);
      }
    }
  };

  const handleSellerProductDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this seller's product?")) return;

    try {
      if (imageUrl) {
        const filePath = imageUrl.split('product-images/public/')[1];
        if (filePath) {
          await supabase.storage.from('product-images').remove([`public/${filePath}`]);
        }
      }

      const { error: dbError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setSellerProducts(sellerProducts.filter(p => p.id !== id));
      
    } catch (err: any) {
      alert("Failed to delete seller product: " + err.message);
    }
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/analytics">Analytics</a>
            <a href="/admin/products" className={styles.activeLink}>My Inventory</a>
            <a href="/admin/orders">All Orders</a>
            <a href="/admin/discounts">Discount Codes</a>
            <a href="/admin/abandoned-carts">Abandoned Carts</a>
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
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Inventory Management</h1>
            <p>Add new products, edit listings, and manage your stock.</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', color: '#1e293b', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>All Products</h2>
              <a href="/admin/products/new" className={adminStyles.actionButton} style={{ textDecoration: 'none' }}>+ Upload New Product</a>
            </div>
          
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('mine')}
              style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'mine' ? '2px solid #0f172a' : '2px solid transparent', fontWeight: activeTab === 'mine' ? 600 : 400, color: '#0f172a', cursor: 'pointer', fontSize: '1rem' }}
            >
              My Inventory
            </button>
            <button 
              onClick={() => setActiveTab('sellers')}
              style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'sellers' ? '2px solid #0f172a' : '2px solid transparent', fontWeight: activeTab === 'sellers' ? 600 : 400, color: '#0f172a', cursor: 'pointer', fontSize: '1rem' }}
            >
              Seller Inventory
            </button>
          </div>

          {activeTab === 'mine' ? (
            <table className={styles.recentOrders}>
              <thead>
                <tr>
                  <th>Product Image</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#1e293b' }}>You have not uploaded any products yet.</td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td style={{ color: '#1e293b' }}>
                        <div 
                          style={{ 
                            width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '4px',
                            backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'
                          }}
                        ></div>
                      </td>
                      <td style={{ color: '#1e293b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{product.title}</span>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>SKU: {product.sku || 'Pending'}</span>
                        </div>
                      </td>
                      <td style={{ color: '#1e293b' }}>£{product.price.toFixed(2)}</td>
                      <td style={{ color: '#1e293b' }}>
                        <button 
                          onClick={() => handleToggleStatus(product.id, product.status)}
                          className={`${adminStyles.statusBadge} ${product.status === 'available' ? adminStyles.statusActive : ''}`}
                          style={{ 
                            border: 'none', 
                            cursor: product.status === 'sold' ? 'pointer' : 'default',
                            fontFamily: 'inherit',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseOver={(e) => { if (product.status === 'sold') e.currentTarget.style.opacity = '0.8'; }}
                          onMouseOut={(e) => { if (product.status === 'sold') e.currentTarget.style.opacity = '1'; }}
                          title={product.status === 'sold' ? 'Click to relist this item' : ''}
                        >
                          {product.status === 'available' ? 'Live' : 'Sold'}
                        </button>
                        <ProductTimer createdAt={product.created_at} />
                      </td>
                      <td style={{ color: '#1e293b' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a href={`/admin/products/${product.id}/edit`} className={adminStyles.actionButton} style={{ textDecoration: 'none', textAlign: 'center' }}>Edit</a>
                          <button 
                            className={adminStyles.actionButton} 
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                            onClick={() => handleDelete(product.id, product.image_url)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.recentOrders}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sellerProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#1e293b' }}>No sellers have uploaded any products yet.</td>
                  </tr>
                ) : (
                  sellerProducts.map((product) => (
                    <tr key={product.id}>
                      <td style={{ color: '#1e293b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{product.profiles?.full_name || 'Unknown'}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {product.seller_id.substring(0, 8)}...</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            marginTop: '0.2rem',
                            color: product.profiles?.tier === 'Gold' ? '#d97706' : (product.profiles?.tier === 'Silver' ? '#475569' : '#9a3412')
                          }}>
                            {product.profiles?.tier || 'Bronze'} Tier
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div 
                            style={{ 
                              width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '4px',
                              backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0
                            }}
                          ></div>
                          <span style={{ fontWeight: 500 }}>{product.title}</span>
                        </div>
                      </td>
                      <td style={{ color: '#1e293b' }}>£{product.price.toFixed(2)}</td>
                      <td style={{ color: '#1e293b' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: product.status === 'available' ? '#d1fae5' : (product.status === 'pending' ? '#fef3c7' : '#fee2e2'),
                          color: product.status === 'available' ? '#065f46' : (product.status === 'pending' ? '#92400e' : '#b91c1c')
                        }}>
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ color: '#1e293b' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a href={`/admin/products/${product.id}/edit`} className={adminStyles.actionButton} style={{ textDecoration: 'none', textAlign: 'center' }}>Edit</a>
                          <button 
                            className={adminStyles.actionButton} 
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                            onClick={() => handleSellerProductDelete(product.id, product.image_url)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
