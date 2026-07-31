"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { WishlistButton } from "../../components/WishlistButton";
import { EarlyAccessBadge } from "../../components/EarlyAccessBadge";
import styles from "../page.module.css";
import Link from "next/link";
import { FilterSidebar } from "../../components/FilterSidebar";

// Need to safely wrap useSearchParams in a Suspense boundary according to Next.js docs
// We will do this by separating the component

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const brandParam = searchParams.get('brand') || '';
  const eraParam = searchParams.get('era') || '';
  const conditionParam = searchParams.get('condition') || '';
  const sizeParam = searchParams.get('size') || '';
  
  const [products, setProducts] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [userTier, setUserTier] = useState('Bronze');

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch user tier for Early Access
      const { data: { session } } = await supabase.auth.getSession();
      let fetchedTier = 'Bronze';
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('tier, role').eq('id', session.user.id).single();
        if (profile) fetchedTier = profile.role === 'admin' ? 'Gold' : (profile.tier || 'Bronze');
      }
      setUserTier(fetchedTier);

      let queryBuilder = supabase
        .from('products')
        .select('*')
        .eq('status', 'available')
        .or(`title.ilike.%${query}%,brand.ilike.%${query}%`);
        
      // Fetch early access setting
      const { data: settings } = await supabase.from('store_settings').select('early_access_disabled, silver_early_access_disabled').eq('id', 1).single();
      const isGoldDisabled = settings?.early_access_disabled === true;
      const isSilverDisabled = settings?.silver_early_access_disabled === true;

      if (userTier === 'Bronze') {
        if (!isGoldDisabled) {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          queryBuilder = queryBuilder.or(`created_at.lt.${twentyFourHoursAgo},early_access_exempt.eq.true`);
        } else if (!isSilverDisabled) {
          const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
          queryBuilder = queryBuilder.or(`created_at.lt.${eightHoursAgo},early_access_exempt.eq.true`);
        }
      } else if (userTier === 'Silver') {
        if (!isSilverDisabled) {
          const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
          queryBuilder = queryBuilder.or(`created_at.lt.${eightHoursAgo},early_access_exempt.eq.true`);
        } else if (!isGoldDisabled) {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          queryBuilder = queryBuilder.or(`created_at.lt.${twentyFourHoursAgo},early_access_exempt.eq.true`);
        }
      }

      const { data, error } = await queryBuilder;
        
      if (data) {
        // Collect brands before filtering
        const brands = Array.from(new Set(data.map(p => p.brand).filter(Boolean))) as string[];
        setAvailableBrands(brands);

        // Apply filters locally since we're using a search query string
        let filteredData = data;
        
        if (brandParam) {
          const bList = brandParam.split(',');
          filteredData = filteredData.filter(p => bList.includes(p.brand));
        }
        if (eraParam) {
          const eList = eraParam.split(',');
          filteredData = filteredData.filter(p => eList.includes(p.era));
        }
        if (conditionParam) {
          const cList = conditionParam.split(',');
          filteredData = filteredData.filter(p => cList.includes(p.condition));
        }
        if (sizeParam) {
          const sList = sizeParam.split(',');
          filteredData = filteredData.filter(p => sList.includes(p.size));
        }

        let sortedData = [...filteredData];
        if (sortOrder === 'price_asc') {
          sortedData.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'price_desc') {
          sortedData.sort((a, b) => b.price - a.price);
        } else {
          sortedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        setProducts(sortedData);
      } else if (error) {
        console.error("Search error:", error);
      }
      setLoading(false);
    };

    fetchResults();
  }, [query, sortOrder, brandParam, eraParam, conditionParam, sizeParam]);

  return (
    <>
      <div style={{ padding: '3rem 0 2rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: 'var(--color-charcoal)' }}>Search Results</h1>
        <p style={{ color: '#64748b' }}>Showing results for "{query}"</p>
      </div>
      
      {/* Filter / Sort Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label htmlFor="sort" style={{ fontWeight: 600, color: '#475569' }}>Sort by:</label>
          <select 
            id="sort" 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        <aside>
          <FilterSidebar availableBrands={availableBrands} />
        </aside>

        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>Searching inventory...</div>
          ) : products.length > 0 ? (
            <div className={styles.productGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div 
                    className={styles.productImage} 
                    style={product.image_url ? { backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    <EarlyAccessBadge createdAt={product.created_at} userTier={userTier} exempt={product.early_access_exempt} />
                  </div>
                  <div className={styles.productInfo}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem', letterSpacing: '0.5px' }}>
                      {product.brand || 'Unbranded'}
                    </div>
                    <h3 className={styles.productName}>{product.title}</h3>
                    <div className={styles.productPrice}>£{product.price.toFixed(2)}</div>
                  </div>
                </Link>
                <WishlistButton productId={product.id} />
              </div>
            ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
              <h3 style={{ color: 'var(--color-charcoal)' }}>No products found</h3>
              <p>We couldn't find anything matching your filters. Try adjusting them!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="container" style={{ minHeight: '60vh' }}>
      <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem 0' }}>Loading search...</div>}>
        <SearchResultsContent />
      </React.Suspense>
    </div>
  );
}
