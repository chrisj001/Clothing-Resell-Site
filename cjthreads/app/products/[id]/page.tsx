"use client";

import styles from "./product.module.css";
import React, { use, useEffect, useState } from "react";
import { useCart } from "../../../context/CartContext";
import { supabase } from "../../../lib/supabase";
import { WishlistButton } from "../../../components/WishlistButton";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayImage, setDisplayImage] = useState("");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  
  // New features state
  const [wishlistCount, setWishlistCount] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);

  // Zoom State
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  // Fit Predictor State
  const [isFitModalOpen, setIsFitModalOpen] = useState(false);
  const [userPit, setUserPit] = useState("");
  const [userLength, setUserLength] = useState("");
  const [fitResult, setFitResult] = useState<{ status: string, message: string } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const calculateFit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !product.pit_to_pit || !product.length) {
      setFitResult({ status: 'error', message: 'Sorry, we don\'t have full measurements for this item to compare against.' });
      return;
    }
    
    // Parse floats and remove non-numeric chars except dot
    const pPit = parseFloat(product.pit_to_pit.replace(/[^0-9.]/g, ''));
    const pLen = parseFloat(product.length.replace(/[^0-9.]/g, ''));
    const uPit = parseFloat(userPit);
    const uLen = parseFloat(userLength);
    
    if (isNaN(pPit) || isNaN(pLen) || isNaN(uPit) || isNaN(uLen)) {
      setFitResult({ status: 'error', message: 'Please ensure all measurements are valid numbers.' });
      return;
    }
    
    let message = "";
    let status = "warning"; // perfect, warning, tight
    
    const pitDiff = pPit - uPit;
    const lenDiff = pLen - uLen;
    
    if (Math.abs(pitDiff) <= 1 && Math.abs(lenDiff) <= 1.5) {
      status = "perfect";
      message = "This item is a PERFECT fit for your measurements!";
    } else if (pitDiff < -0.5 || lenDiff < -1) {
      status = "tight";
      message = `This item will likely be too small. It is ${Math.abs(pitDiff).toFixed(1)}" tighter and ${Math.abs(lenDiff).toFixed(1)}" shorter than your preferred fit.`;
    } else if (pitDiff > 2.5 || lenDiff > 3) {
      status = "loose";
      message = `This will have a very oversized, baggy fit on you. It is ${pitDiff.toFixed(1)}" wider and ${lenDiff.toFixed(1)}" longer than your measurements.`;
    } else {
      status = "good";
      message = "This item should fit you well! It will have a slightly relaxed, comfortable fit based on your measurements.";
    }
    
    setFitResult({ status, message });
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          setProduct(data);
          setDisplayImage(data.image_url);
          
          // Increment views
          const { error: rpcError } = await supabase.rpc('increment_view', { row_id: id });
          if (rpcError) {
            // Fallback if RPC doesn't exist (e.g. before migration runs)
            await supabase.from('products').update({ views: (data.views || 0) + 1 }).eq('id', id);
          }
          
          // Fetch wishlist count (FOMO)
          const { count } = await supabase
            .from('wishlists')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', id);
            
          setWishlistCount(count || 0);

          // Fetch Reviews
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('rating, comment, created_at, customer_id, profiles(full_name)')
            .eq('product_id', id)
            .order('created_at', { ascending: false });
            
          if (reviewsData && reviewsData.length > 0) {
            setReviews(reviewsData);
            const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
            setAverageRating(sum / reviewsData.length);
          }
          
          // Fetch Complete The Look (Similar items)
          let query = supabase
            .from('products')
            .select('id, title, price, image_url, brand')
            .eq('status', 'available')
            .neq('id', id);
            
          // If we have brand or era, try to match
          let orConditions = [];
          if (data.brand) orConditions.push(`brand.eq."${data.brand}"`);
          if (data.era) orConditions.push(`era.eq."${data.era}"`);
          
          if (orConditions.length > 0) {
            query = query.or(orConditions.join(','));
          }
          
          const { data: similar } = await query.limit(4);
            
          if (similar) {
            setSimilarProducts(similar);
          }
        }
      } catch (err) {
        console.error("Error fetching product", err);
      } finally {
        setLoading(false);
        // Force scroll to top when content loads to prevent SPA scroll jumping
        window.scrollTo(0, 0);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;

    if (product.is_single_item === false && !selectedSize) {
      alert("Please select a size before adding to cart.");
      return;
    }

    const itemSize = product.is_single_item ? product.size : selectedSize;
    const currentCartItem = items.find(i => i.id === product.id && i.size === itemSize);
    const currentQty = currentCartItem ? currentCartItem.quantity : 0;
    
    let maxAllowed = 1;
    if (product.is_single_item === false && product.inventory && selectedSize) {
       maxAllowed = product.inventory[selectedSize] || 0;
    }

    if (currentQty >= maxAllowed) {
       alert("You cannot add more of this item to your cart. Maximum stock reached.");
       return;
    }

    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
      quantity: 1,
      size: itemSize,
      image: product.image_url,
    });
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading product...</div>;
  }

  if (!product) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Product not found.</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <button 
        onClick={() => router.back()} 
        style={{ 
          background: 'none', border: 'none', padding: 0, color: '#64748b', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 600,
          marginBottom: '1.5rem', textDecoration: 'none'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'}
        onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
      >
        <span style={{ fontSize: '1.2rem' }}>←</span> Back to Shop
      </button>

      <div className={styles.productContainer}>
        {/* Image Gallery */}
        <div className={styles.imageGallery}>
          <div 
            className={styles.mainImage}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
            style={displayImage ? { 
              backgroundImage: `url(${displayImage})`, 
              backgroundSize: isZooming ? '250%' : 'cover', 
              backgroundPosition: isZooming ? `${zoomPos.x}% ${zoomPos.y}%` : 'center',
              cursor: isZooming ? 'zoom-in' : 'default',
              transition: isZooming ? 'none' : 'background-size 0.3s ease-out'
            } : {}}
          ></div>
          
          {product.additional_images && product.additional_images.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto' }}>
              <div 
                style={{ 
                  width: '80px', height: '80px', flexShrink: 0, borderRadius: '4px', cursor: 'pointer',
                  border: displayImage === product.image_url ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center'
                }}
                onClick={() => setDisplayImage(product.image_url)}
              ></div>
              {product.additional_images.map((img: string, idx: number) => (
                <div 
                  key={idx}
                  style={{ 
                    width: '80px', height: '80px', flexShrink: 0, borderRadius: '4px', cursor: 'pointer',
                    border: displayImage === img ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center'
                  }}
                  onClick={() => setDisplayImage(img)}
                ></div>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className={styles.productDetails}>
          <div>
            <div className={styles.brand}>{product.brand || 'Unbranded'}</div>
            <h1 className={styles.title} style={{ marginBottom: '0.25rem' }}>{product.title}</h1>
            {reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                <span style={{ color: '#eab308', fontSize: '1rem' }}>{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}</span>
                <span style={{ fontWeight: 600 }}>{averageRating.toFixed(1)}</span>
                <span>({reviews.length} reviews)</span>
              </div>
            )}
          </div>
          
          <div className={styles.price}>£{product.price.toFixed(2)}</div>
          
          {/* Measurements & Info */}
          <div className={styles.infoList} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', position: 'relative' }}>
            {product.is_single_item !== false && product.size && (
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Size</div>
                <div><strong>{product.size}</strong></div>
              </div>
            )}
            
            {product.condition && (
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Condition</div>
                <div><strong>{product.condition}</strong></div>
              </div>
            )}
            
            {product.pit_to_pit && (
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Pit to Pit</div>
                <div><strong>{product.pit_to_pit}</strong></div>
              </div>
            )}
            
            {product.length && (
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>Length</div>
                <div><strong>{product.length}</strong></div>
              </div>
            )}

            {product.pit_to_pit && product.length && (
              <button 
                onClick={() => setIsFitModalOpen(true)}
                style={{
                  gridColumn: '1 / -1',
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              >
                <span>📏</span> Will it fit me?
              </button>
            )}
          </div>

          {/* Size Selector for Multiple Sizes */}
          {product.is_single_item === false && product.inventory && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Select Size</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                  const stock = product.inventory[size] || 0;
                  const isOutOfStock = stock <= 0;
                  return (
                    <button
                      key={size}
                      disabled={isOutOfStock}
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        border: selectedSize === size ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        backgroundColor: isOutOfStock ? '#f1f5f9' : (selectedSize === size ? '#f8fafc' : 'white'),
                        color: isOutOfStock ? '#94a3b8' : '#0f172a',
                        fontWeight: selectedSize === size ? 600 : 400,
                        borderRadius: '4px',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        position: 'relative'
                      }}
                    >
                      {size}
                      {isOutOfStock && (
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: '#cbd5e1', transform: 'rotate(-25deg)' }}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className={styles.description}>
            <h3>Seller Notes</h3>
            <p>{product.description || 'No additional details provided.'}</p>
          </div>
          
          {wishlistCount > 0 && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', fontWeight: 500 }}>
              <span style={{ fontSize: '1.25rem' }}>🔥</span>
              <span>{wishlistCount} {wishlistCount === 1 ? 'person has' : 'people have'} this in their wishlist right now!</span>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              className={`btn-primary ${styles.addToCartBtn}`} 
              onClick={handleAddToCart}
              disabled={product.status === 'sold'}
              style={{ flex: 1 }}
            >
              {product.status === 'sold' ? 'Sold Out' : 'Add to Cart'}
            </button>
            <WishlistButton productId={product.id} />
          </div>

          {/* Customer Reviews Section */}
          <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#0f172a' }}>Customer Reviews</h3>
            {reviews.length === 0 ? (
              <p style={{ color: '#64748b' }}>No reviews yet. Be the first to review after purchasing!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {reviews.map((r, idx) => (
                  <div key={idx} style={{ borderBottom: idx !== reviews.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: idx !== reviews.length - 1 ? '1.5rem' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.profiles?.full_name || 'Verified Customer'}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ color: '#eab308', fontSize: '1rem', marginBottom: '0.5rem' }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </div>
                    {r.comment && <p style={{ color: '#475569', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Complete The Look */}
      {similarProducts.length > 0 && (
        <div style={{ marginTop: '5rem', borderTop: '1px solid #e2e8f0', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: '#0f172a' }}>Complete The Look</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {similarProducts.map((p) => (
              <Link 
                key={p.id} 
                href={`/products/${p.id}`} 
                style={{ 
                  textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', 
                  backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', 
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', 
                  transition: 'transform 0.2s', cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div 
                  style={{ width: '100%', paddingTop: '100%', position: 'relative', backgroundImage: `url(${p.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#f1f5f9' }}
                ></div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem', textTransform: 'uppercase' }}>{p.brand || 'Unbranded'}</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</h3>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>£{p.price.toFixed(2)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fit Predictor Modal */}
      {isFitModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px',
            width: '100%', maxWidth: '450px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#0f172a' }}>Fit Predictor 📏</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              Compare this item to a t-shirt you already own that fits you perfectly. Lay your shirt flat to measure.
            </p>

            <form onSubmit={calculateFit}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your Pit to Pit (inches)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={userPit} 
                    onChange={(e) => setUserPit(e.target.value)}
                    required
                    placeholder="e.g. 22.5"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Item is {product.pit_to_pit}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Your Length (inches)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={userLength} 
                    onChange={(e) => setUserLength(e.target.value)}
                    required
                    placeholder="e.g. 29.0"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Item is {product.length}</div>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem' }}
              >
                Calculate Fit
              </button>
            </form>

            {fitResult && (
              <div style={{ 
                padding: '1.25rem', 
                borderRadius: '8px', 
                backgroundColor: fitResult.status === 'perfect' || fitResult.status === 'good' ? '#dcfce3' : (fitResult.status === 'error' || fitResult.status === 'tight' ? '#fee2e2' : '#fef3c7'),
                border: `1px solid ${fitResult.status === 'perfect' || fitResult.status === 'good' ? '#86efac' : (fitResult.status === 'error' || fitResult.status === 'tight' ? '#fca5a5' : '#fde047')}`
              }}>
                <strong style={{ 
                  display: 'block', marginBottom: '0.25rem',
                  color: fitResult.status === 'perfect' || fitResult.status === 'good' ? '#166534' : (fitResult.status === 'error' || fitResult.status === 'tight' ? '#b91c1c' : '#b45309')
                }}>
                  {fitResult.status.toUpperCase()}
                </strong>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.5 }}>
                  {fitResult.message}
                </p>
              </div>
            )}

            <button 
              onClick={() => { setIsFitModalOpen(false); setFitResult(null); }}
              style={{ 
                width: '100%', padding: '0.75rem', marginTop: '1.5rem',
                background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px',
                cursor: 'pointer', fontWeight: 500, color: '#64748b'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
