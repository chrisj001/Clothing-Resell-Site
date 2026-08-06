import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClosetPage({ params }: { params: { id: string } }) {
  // Fetch seller profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!profile || !profile.is_seller) {
    notFound();
  }

  // Fetch seller's available products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', params.id)
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      {/* Seller Header */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ 
          width: '120px', height: '120px', backgroundColor: '#e2e8f0', borderRadius: '50%', margin: '0 auto 1rem auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#94a3b8'
        }}>
          {profile.full_name?.charAt(0) || 'U'}
        </div>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>{profile.full_name}'s Closet</h1>
        <div style={{ color: '#64748b' }}>
          <span style={{ 
            backgroundColor: '#fef3c7', color: '#d97706', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '0.5rem' 
          }}>
            Verified Seller
          </span>
          Joined {new Date(profile.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Closet Products */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Available Items</h2>
      
      {!products || products.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #d1d5db', color: '#64748b' }}>
          This closet is currently empty. Check back later!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
          {products.map((product) => (
            <div key={product.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', flex: 1 }}>
                <div 
                  style={{ 
                    width: '100%', paddingTop: '120%', backgroundColor: '#f1f5f9', position: 'relative', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden' 
                  }}
                >
                  {product.image_url && (
                    <div style={{ backgroundImage: `url(${product.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0' }}>{product.title}</h3>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>£{product.price.toFixed(2)}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
