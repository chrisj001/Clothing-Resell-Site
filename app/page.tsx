import styles from "./page.module.css";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { createClient } from "../lib/supabase-server";
import CuratedSection from "../components/CuratedSection";
import { WishlistButton } from "../components/WishlistButton";
import { EarlyAccessBadge } from "../components/EarlyAccessBadge";
import DropCountdown from "../components/DropCountdown";
import BrandWatermark from "../components/BrandWatermark";

export default async function Home() {
  const categories = [
    { name: "Men", link: "/category/men", image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=600&auto=format&fit=crop" },
    { name: "Women", link: "/category/women", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop" },
    { name: "Kids", link: "/category/kids", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=600&auto=format&fit=crop" },
    { name: "Sale", link: "/category/sale", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&auto=format&fit=crop" },
  ];

  // Fetch user tier for Early Access using the server client
  const supabaseServer = await createClient();
  const { data: { session } } = await supabaseServer.auth.getSession();
  let userTier = 'Bronze';
  if (session) {
    const { data: profile } = await supabase.from('profiles').select('tier, role').eq('id', session.user.id).single();
    if (profile) userTier = profile.role === 'admin' ? 'Gold' : (profile.tier || 'Bronze');
  }

  // Fetch latest products dynamically from Supabase
  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  // Fetch settings
  const { data: settings } = await supabase.from('store_settings').select('early_access_disabled, silver_early_access_disabled, drop_timer_enabled, next_drop_date').eq('id', 1).single();
  const isGoldDisabled = settings?.early_access_disabled === true;
  const isSilverDisabled = settings?.silver_early_access_disabled === true;

  const now = new Date();
  const isDropActive = settings?.drop_timer_enabled && settings?.next_drop_date && new Date(settings.next_drop_date) > now;

  if (isDropActive) {
    // Hide drop items from the homepage until the drop date
    query = query.or('is_drop_item.eq.false,is_drop_item.is.null');
  }

  // Early Access Logic
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

  const { data: featuredProducts } = await query.limit(8);

  return (
    <div>
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>
            Summer Vibes<br />
            <span style={{ color: '#FDE047' }}>Summer Drops</span>
          </h1>
          <p style={{ color: '#FDE047' }}>Discover unique, curated secondhand fashion to elevate your wardrobe.</p>
          <button className="btn-primary">Shop Now</button>
        </div>
      </section>

      {/* Drop Countdown Timer */}
      {settings?.drop_timer_enabled && settings?.next_drop_date && (
        <section style={{ 
          backgroundColor: 'var(--color-charcoal)', 
          padding: '2rem 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <BrandWatermark />
          <div className="container" style={{ position: 'relative', zIndex: 10 }}>
            <DropCountdown dropDateStr={settings.next_drop_date} />
          </div>
        </section>
      )}

      {/* Curated Recommendations (Client Component) */}
      <CuratedSection />

      {/* New Arrivals (First 2) */}
      <section className={styles.newArrivalsSection} style={{ paddingBottom: '2rem' }}>
        <div className="container">
          <h2 className={styles.sectionTitle}>New Arrivals</h2>
          <div className={styles.productGrid}>
            {(featuredProducts || []).slice(0, 4).map((product) => (
              <div key={product.id} className={styles.productCard}>
                <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div 
                    className={styles.productImage} 
                    style={product.image_url ? { backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    <EarlyAccessBadge createdAt={product.created_at} userTier={userTier} exempt={product.early_access_exempt} />
                  </div>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.title}</h3>
                    <div className={styles.productPrice}>£{product.price.toFixed(2)}</div>
                  </div>
                </Link>
                <WishlistButton productId={product.id} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className={styles.categoriesSection} style={{ 
        paddingTop: '4rem', 
        paddingBottom: '4rem',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("/categories-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'var(--color-charcoal)'
      }}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
          <div className={styles.categoryGrid}>
            {categories.map((cat) => (
              <Link key={cat.name} href={cat.link} className={styles.categoryCard}>
                <div className={styles.categoryBg} style={{ backgroundImage: `url(${cat.image})` }}></div>
                <div className={styles.categoryOverlay}></div>
                <h3>{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals (Remaining 6) */}
      <section className={styles.newArrivalsSection} style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className={styles.productGrid}>
            {(featuredProducts || []).slice(4).map((product) => (
              <div key={product.id} className={styles.productCard}>
                <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div 
                    className={styles.productImage} 
                    style={product.image_url ? { backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    <EarlyAccessBadge createdAt={product.created_at} userTier={userTier} exempt={product.early_access_exempt} />
                  </div>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.title}</h3>
                    <div className={styles.productPrice}>£{product.price.toFixed(2)}</div>
                  </div>
                </Link>
                <WishlistButton productId={product.id} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
