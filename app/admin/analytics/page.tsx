"use client";

import styles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [tierCounts, setTierCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [brandData, setBrandData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // New KPI & Trend States
  const [kpis, setKpis] = useState({ totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 });
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  
  // Product Insights States
  const [saleSuggestions, setSaleSuggestions] = useState<any[]>([]);
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  
  const [earlyAccessDisabled, setEarlyAccessDisabled] = useState(false);
  const [silverEarlyAccessDisabled, setSilverEarlyAccessDisabled] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Check admin
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profileData || profileData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      // Fetch Settings
      const { data: settings } = await supabase.from('store_settings').select('early_access_disabled, silver_early_access_disabled').eq('id', 1).single();
      if (settings) {
        setEarlyAccessDisabled(!!settings.early_access_disabled);
        setSilverEarlyAccessDisabled(!!settings.silver_early_access_disabled);
      }

      // 1. Fetch Profiles for Tiers and Top Customers
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles) {
        let bronze = 0, silver = 0, gold = 0;
        profiles.forEach(p => {
          if (p.tier === 'Gold') gold++;
          else if (p.tier === 'Silver') silver++;
          else bronze++;
        });
        setTierCounts({ bronze, silver, gold });
        
        // Sort for Top 5 Whales
        const sorted = [...profiles].sort((a, b) => (b.lifetime_points || 0) - (a.lifetime_points || 0));
        setTopCustomers(sorted.slice(0, 5));
      }

      // 2. Fetch Orders & Products for Brand/Style Analysis & Trends
      const { data: orders } = await supabase.from('orders').select('*').in('status', ['paid', 'shipped', 'delivered']);
      const { data: products } = await supabase.from('products').select('id, brand, category');
      
      if (orders && products) {
        // --- KPI Calculation ---
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        setKpis({ totalRevenue, totalOrders, averageOrderValue: aov });

        // --- Revenue Trend Calculation (Group by Date) ---
        // Group orders by their created_at date string (YYYY-MM-DD)
        const trendsMap: Record<string, number> = {};
        orders.forEach(order => {
          const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          if (!trendsMap[date]) trendsMap[date] = 0;
          trendsMap[date] += Number(order.total_amount) || 0;
        });

        // Convert Map to Array and sort by date chronologically. 
        // We do a simple sort based on original date if possible, but for simplicity we rely on the DB's order or parse it.
        // Let's just create an array of the last 14 days and fill it in, ensuring correct order.
        const trendArray = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          trendArray.push({
            date: dateStr,
            revenue: trendsMap[dateStr] || 0
          });
        }
        setRevenueTrend(trendArray);


        // --- Brand and Category Calculation ---
        const productMap = new Map(products.map(p => [p.id, p]));
        const brandAgg: Record<string, { revenue: number, emails: Set<string> }> = {};
        const catAgg: Record<string, { revenue: number, emails: Set<string> }> = {};

        orders.forEach(order => {
          const email = order.customer_email || 'Unknown';
          const items = order.items || [];
          
          items.forEach((item: any) => {
            const product = productMap.get(item.id);
            if (product) {
              const brand = product.brand || 'Unbranded';
              const cat = product.category || 'Uncategorized';
              const rev = Number(item.price) * Number(item.quantity || 1);
              
              if (!brandAgg[brand]) brandAgg[brand] = { revenue: 0, emails: new Set() };
              brandAgg[brand].revenue += rev;
              if (email !== 'Unknown') brandAgg[brand].emails.add(email);
              
              if (!catAgg[cat]) catAgg[cat] = { revenue: 0, emails: new Set() };
              catAgg[cat].revenue += rev;
              if (email !== 'Unknown') catAgg[cat].emails.add(email);
            }
          });
        });

        const sortedBrands = Object.entries(brandAgg)
          .map(([name, data]) => ({ name, revenue: data.revenue, emails: Array.from(data.emails) }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
          
        const sortedCats = Object.entries(catAgg)
          .map(([name, data]) => ({ name, revenue: data.revenue, emails: Array.from(data.emails) }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        setBrandData(sortedBrands);
        setCategoryData(sortedCats);
      }

      // 3. Fetch Product Insights (Sale Suggestions & Hot Products)
      const { data: allProducts } = await supabase.from('products').select('id, title, image_url, price, views, sold_count, status, created_at');
      const { data: allWishlists } = await supabase.from('wishlists').select('product_id');
      
      if (allProducts) {
        const wishlistCounts: Record<string, number> = {};
        if (allWishlists) {
          allWishlists.forEach(w => {
            wishlistCounts[w.product_id] = (wishlistCounts[w.product_id] || 0) + 1;
          });
        }
        
        const productsWithMetrics = allProducts.map(p => {
          const daysLive = Math.max(0, Math.floor((new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24)));
          const faves = wishlistCounts[p.id] || 0;
          const v = p.views || 0;
          const s = p.sold_count || 0;
          
          // Hot score = views (1 pt) + faves (10 pts) + sales (50 pts)
          const hotScore = v + (faves * 10) + (s * 50);
          
          return { ...p, daysLive, faves, hotScore };
        });
        
        // Sale Suggestions: Available, Oldest (Highest daysLive), Lowest Views
        const suggestions = productsWithMetrics
          .filter(p => p.status === 'available')
          .sort((a, b) => {
            if (b.daysLive !== a.daysLive) return b.daysLive - a.daysLive;
            return a.views - b.views;
          })
          .slice(0, 5);
          
        // Hot Products: Highest Hot Score
        const hottest = productsWithMetrics
          .sort((a, b) => b.hotScore - a.hotScore)
          .slice(0, 5);
          
        setSaleSuggestions(suggestions);
        setHotProducts(hottest);
      }

      setLoading(false);
    };

    fetchAnalytics();
  }, [router]);

  const handleToggleEarlyAccess = async () => {
    const newVal = !earlyAccessDisabled;
    setEarlyAccessDisabled(newVal);
    await supabase.from('store_settings').update({ early_access_disabled: newVal }).eq('id', 1);
  };

  const handleToggleSilverEarlyAccess = async () => {
    const newVal = !silverEarlyAccessDisabled;
    setSilverEarlyAccessDisabled(newVal);
    await supabase.from('store_settings').update({ silver_early_access_disabled: newVal }).eq('id', 1);
  };

  const handleExportCSV = (name: string, emails: string[]) => {
    const csvContent = "data:text/csv;charset=utf-8," + "Email\n" + emails.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${name.replace(/\s+/g, '_').toLowerCase()}_customers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading Analytics...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/analytics" className={styles.activeLink}>Analytics</a>
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
            <h1>Visual Analytics Dashboard</h1>
            <p>Understand your store's performance at a glance.</p>
          </div>

          {/* New KPI Cards */}
          <div className={styles.statsGrid} style={{ marginBottom: '2rem' }}>
            <div className={styles.statCard} style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className={styles.statValue} style={{ color: '#166534' }}>£{kpis.totalRevenue.toFixed(2)}</div>
              <div className={styles.statLabel} style={{ color: '#15803d' }}>Total Revenue</div>
            </div>
            <div className={styles.statCard} style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div className={styles.statValue} style={{ color: '#1e40af' }}>{kpis.totalOrders}</div>
              <div className={styles.statLabel} style={{ color: '#1d4ed8' }}>Total Orders</div>
            </div>
            <div className={styles.statCard} style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <div className={styles.statValue} style={{ color: '#6b21a8' }}>£{kpis.averageOrderValue.toFixed(2)}</div>
              <div className={styles.statLabel} style={{ color: '#7e22ce' }}>Average Order Value</div>
            </div>
          </div>

          {/* Revenue Trends Chart */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '3rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Revenue Trends (Last 14 Days)</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `£${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(val: any) => [`£${Number(val).toFixed(2)}`, 'Revenue']} 
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Loyalty Tier Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.5rem', gap: '0.5rem' }}>
            <h2 style={{ color: '#0f172a', margin: 0, marginBottom: '0.5rem' }}>VIP Loyalty Breakdown</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input type="checkbox" checked={earlyAccessDisabled} onChange={handleToggleEarlyAccess} />
              Disable 24-Hour Early Access (VIP Gold)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <input type="checkbox" checked={silverEarlyAccessDisabled} onChange={handleToggleSilverEarlyAccess} />
              Disable 8-Hour Early Access (VIP Silver)
            </label>
          </div>
          <div className={styles.statsGrid} style={{ marginBottom: '3rem' }}>
            <div className={styles.statCard} style={{ borderTop: '4px solid #fdba74' }}>
              <div className={styles.statValue} style={{ color: '#9a3412' }}>{tierCounts.bronze}</div>
              <div className={styles.statLabel}>Bronze Members</div>
            </div>
            <div className={styles.statCard} style={{ borderTop: '4px solid #d1d5db' }}>
              <div className={styles.statValue} style={{ color: '#475569' }}>{tierCounts.silver}</div>
              <div className={styles.statLabel}>Silver Members</div>
            </div>
            <div className={styles.statCard} style={{ borderTop: '4px solid #facc15' }}>
              <div className={styles.statValue} style={{ color: '#854d0e' }}>{tierCounts.gold}</div>
              <div className={styles.statLabel}>Gold Members (Whales)</div>
            </div>
          </div>

          {/* Top Customers Leaderboard */}
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '3rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Top Customers (Highest Lifetime Value)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.recentOrders}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer Name</th>
                  <th>Lifetime Points</th>
                  <th>Tier</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: i === 0 ? '#eab308' : '#64748b' }}>#{i + 1}</td>
                    <td style={{ color: '#0f172a', fontWeight: 500 }}>{c.full_name || 'Guest User'}</td>
                    <td style={{ color: '#0f172a', fontWeight: 600 }}>{c.lifetime_points || 0}</td>
                    <td>
                      <span className={adminStyles.statusBadge} style={{ 
                        backgroundColor: c.tier === 'Gold' ? '#fef08a' : (c.tier === 'Silver' ? '#e2e8f0' : '#ffedd5'),
                        color: c.tier === 'Gold' ? '#854d0e' : (c.tier === 'Silver' ? '#475569' : '#9a3412')
                      }}>
                        {c.tier || 'Bronze'}
                      </span>
                    </td>
                    <td>
                      {c.id && <button className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => alert("In a full app, this would open a modal to email them a gift code!")}>Send Gift</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          {/* Sales by Brand & Customer Segments */}
          <div className={styles.statsGrid} style={{ marginBottom: '3rem' }}>
            
            {/* BRAND DATA */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Sales by Brand</h2>
              <div style={{ width: '100%', height: 250, marginBottom: '2rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: any) => [`£${Number(val).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '1rem' }}>Brand Audiences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {brandData.map(b => (
                  <div key={b.name} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                      onClick={() => setExpandedBrand(expandedBrand === b.name ? null : b.name)}
                    >
                      <span style={{ fontWeight: 600 }}>{b.name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{b.emails.length} Customers ▼</span>
                    </div>
                    {expandedBrand === b.name && (
                      <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Target these customers for new {b.name} drops.</span>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            onClick={() => handleExportCSV(b.name, b.emails)}
                          >
                            Export CSV
                          </button>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                          {b.emails.length > 0 ? b.emails.map((email: string) => <li key={email}>{email}</li>) : <li>No emails found.</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* STYLE DATA */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Sales by Category (Style)</h2>
              <div style={{ width: '100%', height: 250, marginBottom: '2rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(val: any) => [`£${Number(val).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h3 style={{ fontSize: '1rem', color: '#475569', marginBottom: '1rem' }}>Style Audiences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categoryData.map(c => (
                  <div key={c.name} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                      onClick={() => setExpandedCategory(expandedCategory === c.name ? null : c.name)}
                    >
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{c.emails.length} Customers ▼</span>
                    </div>
                    {expandedCategory === c.name && (
                      <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Target these customers for new {c.name} drops.</span>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            onClick={() => handleExportCSV(c.name, c.emails)}
                          >
                            Export CSV
                          </button>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                          {c.emails.length > 0 ? c.emails.map((email: string) => <li key={email}>{email}</li>) : <li>No emails found.</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Product Insights (Sale Suggestions & Hot Products) */}
          <div className={styles.statsGrid} style={{ marginBottom: '3rem' }}>
            
            {/* SALE SUGGESTIONS */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ color: '#0f172a', margin: 0 }}>Sale Suggestions</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Needs a boost (Oldest + Least Views)</p>
                </div>
                <span style={{ fontSize: '1.5rem' }}>📉</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.recentOrders}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Time Live</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {saleSuggestions.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center' }}>No suggestions available</td></tr>
                  ) : (
                    saleSuggestions.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundImage: `url(${p.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f1f5f9' }}></div>
                            <div style={{ fontWeight: 500, color: '#0f172a', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                          </div>
                        </td>
                        <td style={{ color: '#b91c1c', fontWeight: 600 }}>{p.daysLive} days</td>
                        <td style={{ color: '#475569' }}>{p.views || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>

            {/* HOT PRODUCTS */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ color: '#0f172a', margin: 0 }}>Hot Products</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Top Performers</p>
                </div>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.recentOrders}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Views</th>
                    <th>Hearts</th>
                    <th>Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {hotProducts.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center' }}>No data available</td></tr>
                  ) : (
                    hotProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundImage: `url(${p.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f1f5f9' }}></div>
                            <div style={{ fontWeight: 500, color: '#0f172a', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                          </div>
                        </td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{p.views || 0}</td>
                        <td style={{ color: '#e11d48', fontWeight: 600 }}>{p.faves}</td>
                        <td style={{ color: '#0f172a', fontWeight: 600 }}>{p.sold_count || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
