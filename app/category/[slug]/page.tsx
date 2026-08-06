import styles from "./category.module.css";
import Link from "next/link";
import React from "react";
import { supabase } from "../../../lib/supabase";
import { createClient } from "../../../lib/supabase-server";
import { WishlistButton } from "../../../components/WishlistButton";
import { EarlyAccessBadge } from "../../../components/EarlyAccessBadge";

import { SortSelect } from "../../../components/SortSelect";
import { FilterSidebar } from "../../../components/FilterSidebar";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const formattedSlug = slug.charAt(0).toUpperCase() + slug.slice(1);
  const title = `${formattedSlug} Vintage Collection | CJThreads`;
  const description = `Shop our exclusive secondhand and vintage ${slug} collection. Discover sustainable branded fashion at CJThreads.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; brand?: string; era?: string; condition?: string; size?: string }>;
}) {
  const { slug } = await params;
  const { sort = 'newest', brand, era, condition, size } = await searchParams;
  
  // Fetch ALL products in category to get available brands (before filtering)
  const { data: allCategoryProducts } = await supabase
    .from('products')
    .select('brand')
    .ilike('category', slug)
    .eq('status', 'available');
    
  const availableBrands = Array.from(new Set((allCategoryProducts || []).map(p => p.brand).filter(Boolean))) as string[];
  
  // Early Access logic
  const supabaseServer = await createClient();
  const { data: { session } } = await supabaseServer.auth.getSession();
  let userTier = 'Bronze';
  if (session) {
    const { data: profile } = await supabase.from('profiles').select('tier, role').eq('id', session.user.id).single();
    if (profile) userTier = profile.role === 'admin' ? 'Gold' : (profile.tier || 'Bronze');
  }

  let query = supabase
    .from('products')
    .select('*')
    .ilike('category', slug)
    .eq('status', 'available');

  if (brand) query = query.in('brand', brand.split(','));
  if (era) query = query.in('era', era.split(','));
  if (condition) query = query.in('condition', condition.split(','));
  if (size) query = query.in('size', size.split(','));

  if (sort === 'price-low') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'price-high') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Fetch early access setting
  const { data: settings } = await supabase.from('store_settings').select('early_access_disabled, silver_early_access_disabled').eq('id', 1).single();
  const isGoldDisabled = settings?.early_access_disabled === true;
  const isSilverDisabled = settings?.silver_early_access_disabled === true;

  // Apply Early Access filter
  if (userTier === 'Bronze') {
    if (!isGoldDisabled) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`created_at.lt.${twentyFourHoursAgo},early_access_exempt.eq.true`);
    } else if (!isSilverDisabled) {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      query = query.or(`created_at.lt.${eightHoursAgo},early_access_exempt.eq.true`);
    }
  } else if (userTier === 'Silver') {
    if (!isSilverDisabled) {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      query = query.or(`created_at.lt.${eightHoursAgo},early_access_exempt.eq.true`);
    } else if (!isGoldDisabled) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`created_at.lt.${twentyFourHoursAgo},early_access_exempt.eq.true`);
    }
  }

  const { data: products } = await query;

  const displayProducts = products || [];

  return (
    <div>
      <div className={styles.categoryHeader}>
        <div className="container">
          <h1 className={styles.title}>{slug} Collection</h1>
        </div>
      </div>
      
      <div className={styles.pageBackground}>
        <div className="container">
          <div className={styles.filters}>
            <div>
              <strong>{displayProducts.length} Items Found</strong>
            </div>
            <div>
              <SortSelect currentSort={sort} className={styles.filterSelect} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
            <aside>
              <React.Suspense fallback={<div>Loading filters...</div>}>
                <FilterSidebar availableBrands={availableBrands} />
              </React.Suspense>
            </aside>
            
            <div className={styles.productGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {displayProducts.map((product) => (
                <div key={product.id} className={styles.productCard}>
                  <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div 
                      className={styles.productImage}
                      style={product.image_url ? { backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                      <EarlyAccessBadge createdAt={product.created_at} userTier={userTier} exempt={product.early_access_exempt} />
                    </div>
                    <div className={styles.productInfo}>
                      <div className={styles.productBrand}>{product.brand || 'Unbranded'}</div>
                      <h3 className={styles.productName}>{product.title}</h3>
                      <div className={styles.productPrice}>£{product.price.toFixed(2)}</div>
                      {product.era && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{product.era} • {product.condition}</div>}
                    </div>
                  </Link>
                  <WishlistButton productId={product.id} />
                </div>
              ))}
              
              {displayProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                  <h3 style={{ color: '#334155', marginBottom: '0.5rem' }}>No products match your filters</h3>
                  <p style={{ color: '#64748b' }}>Try removing some filters to see more results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
