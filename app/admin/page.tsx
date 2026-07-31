"use client";

import styles from "../dashboard/dashboard.module.css";
import adminStyles from "./admin.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch the user's profile to check role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData && profileData.role === 'admin') {
        setProfile(profileData);
        
        // Fetch the admin's inventory
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (productsData) {
          setProducts(productsData);
        }
        
        // Fetch the orders for stats
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*');
          
        if (ordersData) {
          setOrders(ordersData);
          
          // Process orders for chart data
          const salesByDate: Record<string, number> = {};
          ordersData.forEach(order => {
             if (['paid', 'shipped', 'delivered'].includes(order.status)) {
                 const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 salesByDate[date] = (salesByDate[date] || 0) + Number(order.total_amount);
             }
          });
          
          // Generate the last 7 days perfectly, defaulting to £0 if no sales that day
          const last7Days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            last7Days.push({
              name: dateStr,
              Revenue: salesByDate[dateStr] || 0
            });
          }
          
          setChartData(last7Days);
        }
        
        // Fetch wishlist count
        const { count } = await supabase
          .from('wishlist_items')
          .select('*', { count: 'exact', head: true });
        if (count !== null) setWishlistCount(count);
        
        setLoading(false);
      } else {
        // Not an admin! Redirect to customer dashboard
        router.push('/dashboard');
      }
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Verifying Admin Credentials...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav>
            <a href="/admin" className={styles.activeLink}>Overview</a>
            <a href="/admin/analytics">Analytics</a>
            <a href="/admin/products">My Inventory</a>
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
            <h1>Command Center</h1>
            <p>Welcome back, {profile?.full_name || 'Admin'}! Manage your store inventory and view sales.</p>
          </div>

          <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>£{orders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).reduce((sum, o) => sum + Number(o.total_amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className={styles.statLabel}>Total Revenue</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{products.filter(p => p.status === 'available').length}</div>
              <div className={styles.statLabel}>Active Listings</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{orders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).length}</div>
              <div className={styles.statLabel}>Total Sales</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{wishlistCount}</div>
              <div className={styles.statLabel}>Wishlist Saves</div>
            </div>
          </div>
          
          {/* Revenue Chart */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '2rem', color: '#0f172a' }}>Revenue Overview (Last 7 Days)</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `£${value}`} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => [`£${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="Revenue" fill="var(--color-teal-dark)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '3rem' }}>
            <h2>Recently Sold Items</h2>
            <a href="/admin/products" className={adminStyles.actionButton} style={{ textDecoration: 'none', backgroundColor: '#f1f5f9', color: '#0f172a' }}>Manage Inventory →</a>
          </div>
          
          <table className={styles.recentOrders}>
            <thead>
              <tr>
                <th>Product Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => p.status === 'sold').length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>You have not sold any products yet.</td>
                </tr>
              ) : (
                products.filter(p => p.status === 'sold').map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div 
                        style={{ 
                          width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '4px',
                          backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'
                        }}
                      ></div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{product.title}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>SKU: {product.sku || 'N/A'}</span>
                      </div>
                    </td>
                    <td>£{product.price.toFixed(2)}</td>
                    <td>
                      <span className={adminStyles.statusBadge} style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                        Sold
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
