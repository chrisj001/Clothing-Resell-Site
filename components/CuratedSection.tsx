"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import styles from "../app/page.module.css";
import { WishlistButton } from "./WishlistButton";

export default function CuratedSection() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchCurated = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, favorite_brands, desired_styles')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name?.split(' ')[0] || "");
        
        const brands = profile.favorite_brands || [];
        const styles = profile.desired_styles || [];

        if (brands.length > 0 || styles.length > 0) {
          // Fetch available products
          // To keep the query simple and robust, we fetch recent products and filter in JS 
          // or use a smart Supabase query.
          // Using a broad OR filter:
          
          let query = supabase.from('products').select('*').eq('status', 'available');
          
          let filterStrings = [];
          if (brands.length > 0) {
            filterStrings.push(`brand.in.("${brands.join('","')}")`);
          }
          if (styles.length > 0) {
            filterStrings.push(`era.in.("${styles.join('","')}")`);
          }

          if (filterStrings.length > 0) {
            query = query.or(filterStrings.join(','));
          }

          const { data: matchedProducts } = await query.order('created_at', { ascending: false }).limit(4);
          
          if (matchedProducts && matchedProducts.length > 0) {
            setProducts(matchedProducts);
          }
        }
      }
      setLoading(false);
    };

    fetchCurated();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section className={styles.newArrivalsSection} style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: '0.5rem', color: 'var(--color-teal-dark)' }}>
              Curated For You, {userName}
            </h2>
            <p style={{ color: '#475569', fontSize: '1.1rem' }}>Based on your favorite brands and eras.</p>
          </div>
          <Link href="/dashboard/profile" style={{ color: 'var(--color-teal-dark)', fontWeight: 600, textDecoration: 'underline' }}>
            Update Preferences
          </Link>
        </div>
        
        <div className={styles.productGrid}>
          {products.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div 
                  className={styles.productImage} 
                  style={product.image_url ? { backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                ></div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles.productPrice}>£{product.price.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                      {product.brand} • {product.era}
                    </div>
                  </div>
                </div>
              </Link>
              <WishlistButton productId={product.id} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
