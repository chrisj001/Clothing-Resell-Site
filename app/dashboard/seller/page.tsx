"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function SellerPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [isSingleItem, setIsSingleItem] = useState(true);
  const [inventory, setInventory] = useState({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
  const [formData, setFormData] = useState({
    brand: "",
    title: "",
    description: "",
    price: "",
    category: "Men",
    size: "",
    condition: "Excellent",
    era: "Modern",
    pit_to_pit: "",
    length: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length > 10) {
        alert("You can only upload a maximum of 10 images.");
        return;
      }
      setImageFiles(files);
      setMainImageIndex(0);
    }
  };

  useEffect(() => {
    const fetchSellerData = async () => {
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
        
      if (!profileData || !profileData.is_seller) {
        router.push('/dashboard');
        return;
      }
      setProfile(profileData);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (productsData) setProducts(productsData);

      setLoading(false);
    };

    fetchSellerData();
  }, [router]);

  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageFiles || imageFiles.length === 0) {
      alert("Please select at least one image");
      return;
    }
    if (!formData.title || !formData.price) {
      alert("Title and Price are required.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Upload all images
      const uploadedUrls = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Image Upload Failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const mainImageUrl = uploadedUrls[mainImageIndex];
      const extraImages = uploadedUrls.filter((_, i) => i !== mainImageIndex);

      const newProduct = {
        seller_id: profile.id,
        brand: formData.brand.trim(),
        era: formData.era,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        size: isSingleItem ? formData.size.trim() : 'Multiple',
        condition: formData.condition.trim(),
        image_url: mainImageUrl,
        additional_images: extraImages,
        pit_to_pit: formData.pit_to_pit.trim() || null,
        length: formData.length.trim() || null,
        status: 'pending',
        is_single_item: isSingleItem,
        inventory: isSingleItem ? null : inventory,
        // Excluded: early_access_exempt, is_drop_item (since admin handles this)
      };

      const { data, error } = await supabase.from('products').insert([newProduct]).select();
      
      if (error) {
        throw error;
      } else if (data) {
        setProducts([data[0], ...products]);
        alert("Product submitted! It is now pending admin review.");
        
        setFormData({
          brand: "",
          title: "",
          description: "",
          price: "",
          category: "Men",
          size: "",
          condition: "Excellent",
          era: "Modern",
          pit_to_pit: "",
          length: "",
        });
        setIsSingleItem(true);
        setInventory({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
        setImageFiles([]);
        setMainImageIndex(0);
        const fileInput = document.getElementById('imageFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      alert("Error submitting product: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}><h2>Loading Seller Portal...</h2></div>;

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="seller" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Seller Portal</h1>
            <p>Manage your closet and submit new items for review.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '2rem' }}>
            {/* Upload Form */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a' }}>Submit New Item</h2>
              <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsSingleItem(true)} 
                    style={{ 
                      flex: 1, padding: '1rem', 
                      border: isSingleItem ? '2px solid #0f172a' : '1px solid #d1d5db', 
                      borderRadius: '4px', 
                      backgroundColor: isSingleItem ? '#f8fafc' : 'white', 
                      fontWeight: isSingleItem ? 600 : 400,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    Single Item (1-of-1)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsSingleItem(false)} 
                    style={{ 
                      flex: 1, padding: '1rem', 
                      border: !isSingleItem ? '2px solid #0f172a' : '1px solid #d1d5db', 
                      borderRadius: '4px', 
                      backgroundColor: !isSingleItem ? '#f8fafc' : 'white', 
                      fontWeight: !isSingleItem ? 600 : 400,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    Quantity (Multi-Size)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="imageFile" style={{ fontWeight: 600, color: '#0f172a' }}>Product Images * (Up to 10 images)</label>
                  <input type="file" id="imageFile" accept="image/*" multiple onChange={handleFileChange} required style={{ color: '#0f172a', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: 'white' }} />
                  
                  {imageFiles.length > 0 && (
                    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>Select Main Image:</p>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {imageFiles.map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div 
                              style={{ 
                                width: '80px', height: '80px', borderRadius: '4px', border: mainImageIndex === idx ? '3px solid #0f172a' : '1px solid #ccc',
                                backgroundImage: `url(${URL.createObjectURL(file)})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer'
                              }}
                              onClick={() => setMainImageIndex(idx)}
                            ></div>
                            <input 
                              type="radio" 
                              name="mainImage" 
                              checked={mainImageIndex === idx} 
                              onChange={() => setMainImageIndex(idx)} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="brand" style={{ fontWeight: 600, color: '#0f172a' }}>Brand</label>
                    <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="e.g. Nike" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="era" style={{ fontWeight: 600, color: '#0f172a' }}>Era</label>
                    <select id="era" name="era" value={formData.era} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: '#0f172a' }}>
                      <option value="Modern">Modern (2010s-Now)</option>
                      <option value="Y2K">Y2K (2000s)</option>
                      <option value="90s">90s</option>
                      <option value="80s">80s</option>
                      <option value="70s">70s & Older</option>
                    </select>
                  </div>
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="title" style={{ fontWeight: 600, color: '#0f172a' }}>Product Title *</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Vintage 90s Windbreaker" required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="price" style={{ fontWeight: 600, color: '#0f172a' }}>Price (£) *</label>
                    <input type="number" step="0.01" id="price" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g. 45.00" required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="category" style={{ fontWeight: 600, color: '#0f172a' }}>Category *</label>
                    <select id="category" name="category" value={formData.category} onChange={handleInputChange} required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: '#0f172a' }}>
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Vintage">Vintage</option>
                      <option value="Sale">Sale</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {isSingleItem ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label htmlFor="size" style={{ fontWeight: 600, color: '#0f172a' }}>Size</label>
                      <input type="text" id="size" name="size" value={formData.size} onChange={handleInputChange} placeholder="e.g. Men's Large" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: 600, color: '#0f172a' }}>Size Inventory</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                        {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                          <div key={size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, width: '40px', color: '#0f172a' }}>{size}</span>
                            <input 
                              type="number" 
                              min="0" 
                              value={(inventory as any)[size]} 
                              onChange={(e) => setInventory({...inventory, [size]: parseInt(e.target.value) || 0})} 
                              style={{ width: '80px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', color: '#0f172a' }} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="condition" style={{ fontWeight: 600, color: '#0f172a' }}>Condition</label>
                    <select id="condition" name="condition" value={formData.condition} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: '#0f172a' }}>
                      <option value="Brand New(BNWT)">Brand New(BNWT)</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Vintage Wear">Vintage Wear</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="pit_to_pit" style={{ fontWeight: 600, color: '#0f172a' }}>Pit to Pit (inches)</label>
                    <input type="text" id="pit_to_pit" name="pit_to_pit" value={formData.pit_to_pit} onChange={handleInputChange} placeholder='e.g. 22"' style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="length" style={{ fontWeight: 600, color: '#0f172a' }}>Length (inches)</label>
                    <input type="text" id="length" name="length" value={formData.length} onChange={handleInputChange} placeholder='e.g. 28"' style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', color: '#0f172a' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="description" style={{ fontWeight: 600, color: '#0f172a' }}>Seller Notes / Description</label>
                  <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Describe the item, any flaws, material, etc." style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit', color: '#0f172a' }}></textarea>
                </div>

                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </form>
            </div>

            {/* Listed Products */}
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Your Closet Items</h2>
              {products.length === 0 ? (
                <div style={{ padding: '2rem', backgroundColor: 'white', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                  You haven't submitted any items yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {products.map(product => (
                    <div key={product.id} style={{ display: 'flex', padding: '1rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', gap: '1rem' }}>
                      <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        {product.image_url && <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>{product.title}</h3>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold',
                            backgroundColor: product.status === 'available' ? '#dcfce3' : product.status === 'pending' ? '#fef3c7' : '#e2e8f0',
                            color: product.status === 'available' ? '#166534' : product.status === 'pending' ? '#b45309' : '#475569'
                          }}>
                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                          </span>
                        </div>
                        <div style={{ color: '#475569', fontWeight: 600 }}>£{product.price.toFixed(2)}</div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {product.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
