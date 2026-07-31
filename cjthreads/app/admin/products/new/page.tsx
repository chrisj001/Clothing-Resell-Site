"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";
import dashboardStyles from "../../../dashboard/dashboard.module.css";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [isSingleItem, setIsSingleItem] = useState(true);
  const [inventory, setInventory] = useState({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
  const [disableEarlyAccess, setDisableEarlyAccess] = useState(false);
  const [isDropItem, setIsDropItem] = useState(false);

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

  // Authenticate admin
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

      if (profile && profile.role === 'admin') {
        setAdminId(session.user.id);
      } else {
        router.push('/dashboard');
      }
    };
    checkAdmin();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFiles(Array.from(e.target.files));
      setMainImageIndex(0); // Reset main image to first one
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (!adminId) throw new Error("Not authenticated as admin");
      if (!formData.title || !formData.price) throw new Error("Title and Price are required.");
      if (!imageFiles || imageFiles.length === 0) throw new Error("Please upload at least one product image.");

      // 1. Upload all images to Supabase Storage
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

      // 2. Separate Main Image and Additional Images
      const mainImageUrl = uploadedUrls[mainImageIndex];
      const extraImages = uploadedUrls.filter((_, i) => i !== mainImageIndex);

      // 3. Insert Product into Database
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          seller_id: adminId,
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
          status: 'available',
          is_single_item: isSingleItem,
          inventory: isSingleItem ? null : inventory,
          early_access_exempt: disableEarlyAccess,
          is_drop_item: isDropItem
        });

      if (dbError) throw new Error(`Database Error: ${dbError.message}`);

      setSuccess(true);
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
      setDisableEarlyAccess(false);
      setIsDropItem(false);
      setImageFiles([]);
      setMainImageIndex(0);
      // Reset file input manually
      const fileInput = document.getElementById('imageFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!adminId) return null; // Wait until admin is verified

  return (
    <div className="container">
      <div className={styles.adminContainer}>
        {/* Sidebar */}
        <aside className={dashboardStyles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/products" className={dashboardStyles.activeLink}>My Inventory</a>
            <a href="/admin/orders">All Orders</a>
            <a href="/admin/discounts">Discount Codes</a>
            <a href="/admin/abandoned-carts">Abandoned Carts</a>
            <a href="/admin/users">User Management</a>
            <a href="/admin/settings">Store Settings</a>
          </nav>
        </aside>

        {/* Main Content */}
        <div className={dashboardStyles.mainContent}>
          <div className={dashboardStyles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <a href="/admin/products" style={{ textDecoration: 'none', color: 'white', fontSize: '1.5rem' }}>←</a>
              <h1>Upload New Product</h1>
            </div>
            <p>Add a new item to your store's inventory.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
            {error && <div style={{ color: '#d9534f', padding: '1rem', backgroundColor: '#fdf0ef', borderRadius: '4px' }}>{error}</div>}
            {success && <div style={{ color: 'green', padding: '1rem', backgroundColor: '#eafaf1', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Product successfully uploaded! It is now live on the site.</span><a href="/admin/products" style={{ color: '#0f172a', fontWeight: 'bold', textDecoration: 'underline' }}>Back to list &rarr;</a></div>}
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setIsSingleItem(true)} 
                style={{ 
                  flex: 1, padding: '1rem', 
                  border: isSingleItem ? '2px solid #0f172a' : '1px solid #cbd5e1', 
                  borderRadius: '4px', 
                  backgroundColor: isSingleItem ? '#f8fafc' : 'white', 
                  fontWeight: isSingleItem ? 600 : 400,
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
                  border: !isSingleItem ? '2px solid #0f172a' : '1px solid #cbd5e1', 
                  borderRadius: '4px', 
                  backgroundColor: !isSingleItem ? '#f8fafc' : 'white', 
                  fontWeight: !isSingleItem ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Quantity (Multi-Size)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="imageFile" style={{ fontWeight: 600 }}>Product Images * (Select multiple)</label>
              <input type="file" id="imageFile" accept="image/*" multiple onChange={handleFileChange} required />
              
              {imageFiles.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9rem' }}>Select Main Image:</p>
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
                <label htmlFor="brand" style={{ fontWeight: 600 }}>Brand</label>
                <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleInputChange} placeholder="e.g. Nike" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="era" style={{ fontWeight: 600 }}>Era</label>
                <select id="era" name="era" value={formData.era} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
                  <option value="Modern">Modern (2010s-Now)</option>
                  <option value="Y2K">Y2K (2000s)</option>
                  <option value="90s">90s</option>
                  <option value="80s">80s</option>
                  <option value="70s">70s & Older</option>
                </select>
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="title" style={{ fontWeight: 600 }}>Product Title *</label>
                <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Vintage 90s Windbreaker" required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="price" style={{ fontWeight: 600 }}>Price (£) *</label>
                <input type="number" step="0.01" id="price" name="price" value={formData.price} onChange={handleInputChange} placeholder="e.g. 45.00" required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="category" style={{ fontWeight: 600 }}>Category *</label>
                <select id="category" name="category" value={formData.category} onChange={handleInputChange} required style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
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
                  <label htmlFor="size" style={{ fontWeight: 600 }}>Size</label>
                  <input type="text" id="size" name="size" value={formData.size} onChange={handleInputChange} placeholder="e.g. Men's Large" style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: 600 }}>Size Inventory</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <div key={size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, width: '40px' }}>{size}</span>
                        <input 
                          type="number" 
                          min="0" 
                          value={(inventory as any)[size]} 
                          onChange={(e) => setInventory({...inventory, [size]: parseInt(e.target.value) || 0})} 
                          style={{ width: '80px', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="condition" style={{ fontWeight: 600 }}>Condition</label>
                <select id="condition" name="condition" value={formData.condition} onChange={handleInputChange} style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
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
                <label htmlFor="pit_to_pit" style={{ fontWeight: 600 }}>Pit to Pit (inches)</label>
                <input type="text" id="pit_to_pit" name="pit_to_pit" value={formData.pit_to_pit} onChange={handleInputChange} placeholder='e.g. 22"' style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="length" style={{ fontWeight: 600 }}>Length (inches)</label>
                <input type="text" id="length" name="length" value={formData.length} onChange={handleInputChange} placeholder='e.g. 28"' style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="description" style={{ fontWeight: 600 }}>Seller Notes / Description</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Describe the item, any flaws, material, etc." style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }}></textarea>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={disableEarlyAccess} onChange={(e) => setDisableEarlyAccess(e.target.checked)} />
                Disable Early Access
              </label>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>If checked, this product will bypass the 24-hour / 8-hour Early Access wait periods and be visible to everyone instantly.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={isDropItem} onChange={(e) => setIsDropItem(e.target.checked)} />
                Part of Next Drop (Hidden until timer ends)
              </label>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>If checked, this product will be hidden from the homepage until the Drop Timer hits zero.</p>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
              {loading ? "Uploading..." : "Upload Product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
