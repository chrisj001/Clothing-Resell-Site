"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [settings, setSettings] = useState({
    store_name: "",
    contact_email: "",
    loyalty_ratio: 10,
    drop_timer_enabled: false,
    next_drop_date: ""
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (settingsData) {
        let initialNextDropDate = "";
        if (settingsData.next_drop_date) {
          const d = new Date(settingsData.next_drop_date);
          if (!isNaN(d.getTime())) {
            initialNextDropDate = d.toISOString().slice(0, 16);
          }
        }
        setSettings({
          store_name: settingsData.store_name || "",
          contact_email: settingsData.contact_email || "",
          loyalty_ratio: settingsData.loyalty_ratio || 10,
          drop_timer_enabled: settingsData.drop_timer_enabled || false,
          next_drop_date: initialNextDropDate
        });
      }
      
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings({ ...settings, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      let finalNextDropDate = null;
      if (settings.next_drop_date) {
        const d = new Date(settings.next_drop_date);
        if (!isNaN(d.getTime())) {
          finalNextDropDate = d.toISOString();
        } else {
          throw new Error("Invalid drop date selected. Please check your Next Drop Date & Time.");
        }
      }

      const { error: updateError } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          contact_email: settings.contact_email,
          loyalty_ratio: parseInt(settings.loyalty_ratio.toString(), 10),
          drop_timer_enabled: settings.drop_timer_enabled,
          next_drop_date: finalNextDropDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
            <a href="/admin/users">User Management</a>
            <a href="/admin/settings" className={dashboardStyles.activeLink}>Store Settings</a>
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
            <h1>Store Settings</h1>
            <p>Manage store preferences and loyalty rules.</p>
          </div>

          <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
              {error && <div style={{ color: '#d9534f', padding: '1rem', backgroundColor: '#fdf0ef', borderRadius: '4px' }}>{error}</div>}
              {success && <div style={{ color: 'green', padding: '1rem', backgroundColor: '#eafaf1', borderRadius: '4px' }}>Settings saved successfully!</div>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="store_name" style={{ fontWeight: 600, color: '#000' }}>Store Name</label>
                <input 
                  type="text" 
                  id="store_name" 
                  name="store_name" 
                  value={settings.store_name} 
                  onChange={handleInputChange} 
                  required 
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="contact_email" style={{ fontWeight: 600, color: '#000' }}>Contact Email</label>
                <input 
                  type="email" 
                  id="contact_email" 
                  name="contact_email" 
                  value={settings.contact_email} 
                  onChange={handleInputChange} 
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="loyalty_ratio" style={{ fontWeight: 600, color: '#000' }}>Loyalty Points Ratio (Points per £1 spent)</label>
                <input 
                  type="number" 
                  id="loyalty_ratio" 
                  name="loyalty_ratio" 
                  value={settings.loyalty_ratio} 
                  onChange={handleInputChange} 
                  required 
                  min="1"
                  style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
                <small style={{ color: '#666' }}>E.g. If set to 10, a £50 item gives 500 points.</small>
              </div>

              <hr style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', width: '100%' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#0f172a' }}>Drop Mechanics</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure the homepage countdown timer for upcoming drops.</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="drop_timer_enabled" 
                    name="drop_timer_enabled" 
                    checked={settings.drop_timer_enabled} 
                    onChange={handleInputChange} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} 
                  />
                  <label htmlFor="drop_timer_enabled" style={{ fontWeight: 600, color: '#000', cursor: 'pointer' }}>Enable Next Drop Countdown</label>
                </div>

                {settings.drop_timer_enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <label htmlFor="next_drop_date" style={{ fontWeight: 600, color: '#000' }}>Next Drop Date & Time</label>
                    <input 
                      type="datetime-local" 
                      id="next_drop_date" 
                      name="next_drop_date" 
                      value={settings.next_drop_date} 
                      onChange={handleInputChange} 
                      required={settings.drop_timer_enabled}
                      style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
