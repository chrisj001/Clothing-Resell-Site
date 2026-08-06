"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { WishlistButton } from "../../../components/WishlistButton";
import styles from "../dashboard.module.css";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function WishlistPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          product_id,
          products (
            id, title, price, image_url, brand, status
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) {
        // filter out nulls in case a product was deleted
        const validProducts = data
          .map(item => item.products)
          .filter(p => p !== null);
        setProducts(validProducts);
      }
      setLoading(false);
    };

    fetchWishlist();
  }, []);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading your secure dashboard...</div>;
  }

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="wishlist" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#0f172a' }}>My Wishlist</h1>
          
          {products.length === 0 ? (
            <div style={{ backgroundColor: '#d1d5db', padding: '3rem', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💔</div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Your wishlist is empty</h2>
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Save items you love and keep an eye on them here.</p>
              <Link href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {products.map(product => (
                <div key={product.id} style={{ position: 'relative', backgroundColor: '#d1d5db', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
                  <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div 
                      style={{ 
                        width: '100%', 
                        paddingTop: '120%', 
                        position: 'relative', 
                        backgroundImage: `url(${product.image_url})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center', 
                        backgroundColor: '#f1f5f9',
                        opacity: product.status === 'sold' ? 0.6 : 1
                      }}
                    >
                      {product.status === 'sold' && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem 1rem', fontWeight: 600, borderRadius: '4px' }}>
                          SOLD OUT
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem', textTransform: 'uppercase' }}>{product.brand || 'Unbranded'}</div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</h3>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>£{product.price.toFixed(2)}</div>
                    </div>
                  </Link>
                  <WishlistButton productId={product.id} initialIsWishlisted={true} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
