"use client";

import styles from "../dashboard.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialData, setInitialData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    mobile_number: "",
    birthday: "",
    address_line1: "",
    city: "",
    postal_code: "",
    country: "",
    use_for_checkout: true,
    size_tops: "",
    size_bottoms: "",
    size_shoes: "",
    desired_styles: [] as string[],
    favorite_brands: [] as string[],
  });

  const availableEras = ["Modern", "Y2K", "90s", "80s", "70s & Older"];
  const popularBrands = ["Nike", "Adidas", "Carhartt", "Levi's", "The North Face", "Ralph Lauren", "Tommy Hilfiger", "Ted Baker", "Lacoste", "NBA", "Diesel", "Calvin Klein", "Evisu", "Hugo Boss", "Paul Smith", "Patagonia", "Football Premier League", "Cycling Brands"];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        
        if (profileData) {
          setInitialData(profileData);
          setFormData({
            full_name: profileData.full_name || "",
            mobile_number: profileData.mobile_number || "",
            birthday: profileData.birthday ? new Date(profileData.birthday).toISOString().split('T')[0] : "",
            address_line1: profileData.address_line1 || "",
            city: profileData.city || "",
            postal_code: profileData.postal_code || "",
            country: profileData.country || "",
            use_for_checkout: profileData.use_for_checkout !== false,
            size_tops: profileData.size_tops || "",
            size_bottoms: profileData.size_bottoms || "",
            size_shoes: profileData.size_shoes || "",
            desired_styles: profileData.desired_styles || [],
            favorite_brands: profileData.favorite_brands || [],
          });
        }
      } catch (err) {
        console.error("Profile error", err);
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      if (name === 'use_for_checkout') {
        setFormData(prev => ({ ...prev, [name]: checked }));
      } else if (availableEras.includes(value)) {
        setFormData(prev => {
          const current = prev.desired_styles;
          return { ...prev, desired_styles: checked ? [...current, value] : current.filter(s => s !== value) };
        });
      } else if (popularBrands.includes(value)) {
        setFormData(prev => {
          const current = prev.favorite_brands;
          return { ...prev, favorite_brands: checked ? [...current, value] : current.filter(b => b !== value) };
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          mobile_number: formData.mobile_number,
          birthday: formData.birthday || null,
          address_line1: formData.address_line1,
          city: formData.city,
          postal_code: formData.postal_code,
          country: formData.country,
          use_for_checkout: formData.use_for_checkout,
          size_tops: formData.size_tops,
          size_bottoms: formData.size_bottoms,
          size_shoes: formData.size_shoes,
          desired_styles: formData.desired_styles,
          favorite_brands: formData.favorite_brands
        })
        .eq('id', session.user.id);
        
      if (updateError) throw updateError;
      
      setMessage("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading your profile...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="profile" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Profile & Preferences</h1>
            <p>Manage your personal information, sizes, and style preferences.</p>
          </div>

          {message && (
            <div style={{ padding: '1rem', backgroundColor: '#dcfce3', color: '#166534', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #86efac', marginTop: '2rem' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #fca5a5', marginTop: '2rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
            
            {/* Personal Details */}
            <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', color: '#1e293b' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #94a3b8', paddingBottom: '0.5rem' }}>Personal Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="full_name" style={{ fontWeight: 600 }}>Full Name</label>
                  <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder="e.g. John Doe" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8', backgroundColor: initialData?.full_name ? '#f1f5f9' : 'white', color: initialData?.full_name ? '#64748b' : 'inherit' }} disabled={!!initialData?.full_name} />
                  {!!initialData?.full_name && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Name cannot be changed once set.</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="mobile_number" style={{ fontWeight: 600 }}>Mobile Number</label>
                  <input type="tel" id="mobile_number" name="mobile_number" value={formData.mobile_number} onChange={handleInputChange} placeholder="e.g. +44 7700 900077" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="birthday" style={{ fontWeight: 600 }}>Birthday (For special offers!)</label>
                  <input type="date" id="birthday" name="birthday" value={formData.birthday} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8', fontFamily: 'inherit', backgroundColor: initialData?.birthday ? '#f1f5f9' : 'white', color: initialData?.birthday ? '#64748b' : 'inherit' }} disabled={!!initialData?.birthday} />
                  {!!initialData?.birthday && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Birthday cannot be changed once set.</span>}
                </div>
              </div>
            </div>

            {/* My Sizes */}
            <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', color: '#1e293b' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #94a3b8', paddingBottom: '0.5rem' }}>My Sizes</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>We'll use this to show you products that fit perfectly.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="size_tops" style={{ fontWeight: 600 }}>Tops (Shirts, Jackets)</label>
                  <select id="size_tops" name="size_tops" value={formData.size_tops} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8', backgroundColor: 'white' }}>
                    <option value="">Select Size...</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="size_bottoms" style={{ fontWeight: 600 }}>Bottoms (Waist)</label>
                  <select id="size_bottoms" name="size_bottoms" value={formData.size_bottoms} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8', backgroundColor: 'white' }}>
                    <option value="">Select Size...</option>
                    {Array.from({length: 15}, (_, i) => i + 26).map(size => (
                      <option key={size} value={`${size}W`}>{size}W</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="size_shoes" style={{ fontWeight: 600 }}>Shoes (UK)</label>
                  <select id="size_shoes" name="size_shoes" value={formData.size_shoes} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8', backgroundColor: 'white' }}>
                    <option value="">Select Size...</option>
                    {Array.from({length: 15}, (_, i) => (i + 10) / 2).map(size => (
                      <option key={size} value={`UK ${size}`}>UK {size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Style Preferences */}
            <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', color: '#1e293b' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #94a3b8', paddingBottom: '0.5rem' }}>Style Preferences</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>Select your favorite eras and brands to get personalized recommendations on the homepage!</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem' }}>Favorite Eras</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    {availableEras.map(era => (
                      <label key={era} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                        <input 
                          type="checkbox" 
                          name="desired_styles" 
                          value={era}
                          checked={formData.desired_styles.includes(era)}
                          onChange={handleInputChange}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal-dark)' }}
                        />
                        {era}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ marginBottom: '1rem' }}>Favorite Brands</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {popularBrands.map(brand => (
                      <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                        <input 
                          type="checkbox" 
                          name="favorite_brands" 
                          value={brand}
                          checked={formData.favorite_brands.includes(brand)}
                          onChange={handleInputChange}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal-dark)' }}
                        />
                        {brand}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div style={{ backgroundColor: '#cbd5e1', padding: '2rem', borderRadius: '8px', color: '#1e293b' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #94a3b8', paddingBottom: '0.5rem' }}>Shipping Address</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="address_line1" style={{ fontWeight: 600 }}>Address Line 1</label>
                  <input type="text" id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleInputChange} placeholder="e.g. 123 High Street" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="city" style={{ fontWeight: 600 }}>City</label>
                    <input type="text" id="city" name="city" value={formData.city} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="postal_code" style={{ fontWeight: 600 }}>Postal Code</label>
                    <input type="text" id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="country" style={{ fontWeight: 600 }}>Country</label>
                  <input type="text" id="country" name="country" value={formData.country} onChange={handleInputChange} placeholder="e.g. GB" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #94a3b8' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" id="use_for_checkout" name="use_for_checkout" checked={formData.use_for_checkout} onChange={handleInputChange} style={{ width: '18px', height: '18px', accentColor: 'var(--color-teal-dark)' }} />
                  <label htmlFor="use_for_checkout" style={{ fontWeight: 500, cursor: 'pointer' }}>Use this address to autofill on payment</label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start', padding: '1rem 3rem', fontSize: '1.1rem' }}>
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
