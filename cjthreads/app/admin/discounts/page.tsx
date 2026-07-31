"use client";

import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminDiscountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<any[]>([]);
  
  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [usageType, setUsageType] = useState("unlimited");
  const [maxUses, setMaxUses] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      const { data } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setCodes(data);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage("");

    const upperCode = code.toUpperCase().trim();
    if (!upperCode) {
      setMessage("Error: Code cannot be empty.");
      setCreating(false);
      return;
    }

    let finalMaxUses = null;
    if (usageType === 'onetime') {
      finalMaxUses = 1;
    } else if (usageType === 'custom') {
      finalMaxUses = parseInt(maxUses);
      if (isNaN(finalMaxUses) || finalMaxUses <= 0) {
        setMessage("Error: Custom limit must be greater than 0.");
        setCreating(false);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .insert({
          code: upperCode,
          discount_type: type,
          discount_value: parseFloat(value),
          max_uses: finalMaxUses,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCodes([data, ...codes]);
      setMessage("Code created successfully!");
      setCode("");
      setValue("");
    } catch (err: any) {
      setMessage("Error: " + (err.message || "Failed to create code. It may already exist."));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setCodes(codes.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this discount code?")) return;

    const { error } = await supabase
      .from('discount_codes')
      .delete()
      .eq('id', id);

    if (!error) {
      setCodes(codes.filter(c => c.id !== id));
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
            <a href="/admin/discounts" className={dashboardStyles.activeLink}>Discount Codes</a>
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
        <div className={dashboardStyles.mainContent}>
          <div className={dashboardStyles.header}>
            <h1>Discount Codes</h1>
            <p>Create and manage promotional codes for your customers.</p>
          </div>

          {/* Create Form */}
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Create New Code</h2>
            
            {message && (
              <div style={{ padding: '1rem', backgroundColor: message.startsWith('Error') ? '#fee2e2' : '#dcfce3', color: message.startsWith('Error') ? '#b91c1c' : '#166534', borderRadius: '4px', marginBottom: '1.5rem' }}>
                {message}
              </div>
            )}

            <form onSubmit={handleCreateCode} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Code Name</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER20"
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Discount Type</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (£)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Value</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === 'percentage' ? "e.g. 15" : "e.g. 10.00"}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Usage Limit</label>
                <select 
                  value={usageType} 
                  onChange={(e) => setUsageType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="unlimited">Unlimited Uses</option>
                  <option value="onetime">One-Time Use Only</option>
                  <option value="custom">Custom Limit...</option>
                </select>
              </div>

              {usageType === 'custom' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Maximum Uses</label>
                  <input 
                    type="number" 
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Generate Code"}
                </button>
              </div>
            </form>
          </div>

          {/* List existing codes */}
          <h2>Active & Past Codes</h2>
          <table className={dashboardStyles.recentOrders} style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Discount</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Usage</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No discount codes created yet.</td>
                </tr>
              ) : (
                codes.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#0f172a' }}>{c.code}</td>
                    <td style={{ padding: '1rem' }}>
                      {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `£${c.discount_value.toFixed(2)} OFF`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.9rem' }}>{c.current_uses} uses</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Limit: {c.max_uses === null ? 'Unlimited' : c.max_uses}
                        {c.max_uses !== null && c.current_uses >= c.max_uses && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>(Maxed out)</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '999px', 
                        fontSize: '0.8rem', 
                        fontWeight: 500,
                        backgroundColor: c.is_active ? '#dcfce3' : '#fee2e2',
                        color: c.is_active ? '#166534' : '#b91c1c'
                      }}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleToggleActive(c.id, c.is_active)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontSize: '0.85rem' }}
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
        </div>
      </div>
    </div>
  );
}
