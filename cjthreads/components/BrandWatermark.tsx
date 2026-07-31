import React from 'react';

const row1Brands = [
  { name: 'Lacoste', src: '/brand_images/Lacoste-Logo.wine.svg', forceWhite: false },
  { name: 'Ralph Lauren', src: '/brand_images/ralphlauren.svg', forceWhite: true },
  { name: 'Nike', src: '/brand_images/Nike,_Inc.-White-Logo.wine.svg', forceWhite: false },
  { name: 'NBA', src: '/brand_images/nba-6.svg?v=1', forceWhite: false },
  { name: 'Puma', src: '/brand_images/puma-seeklogo.svg', forceWhite: true },
  { name: 'Adidas', src: '/brand_images/Adidas-White-Logo.wine.svg', forceWhite: false },
  { name: 'Champion', src: '/brand_images/champion-logo.svg', forceWhite: false },
  { name: "Levi's", src: '/brand_images/levis-1.svg', forceWhite: false }
];

const row2Brands = [
  { name: 'Ted Baker', src: '/brand_images/Ted_Baker-Logo.wine.svg', forceWhite: true },
  { name: 'Tommy Hilfiger', src: '/brand_images/tommy-hilfiger-3.svg', forceWhite: false },
  { name: 'Barbour', src: '/brand_images/barbour-brand-logo.svg?v=2', forceWhite: true },
  { name: 'Kappa', src: '/brand_images/kappa-1.svg', forceWhite: false },
  { name: 'Dickies', src: '/brand_images/dickies_logo.svg', forceWhite: false },
  { name: 'Columbia', src: '/brand_images/Columbia_Sportswear-Logo.wine.svg', forceWhite: true },
  { name: 'Patagonia', src: '/brand_images/patagonia-seeklogo.png', forceWhite: false },
  { name: 'The North Face', src: '/brand_images/the-north-face-1.svg', forceWhite: true }
];

export default function BrandWatermark() {
  const row1 = [...row1Brands];
  const row2 = [...row2Brands];

  const renderBrand = (b: any, index: number) => (
    <div key={index} style={{ width: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src={b.src} 
          alt={b.name} 
          style={{ 
            maxWidth: '120px', 
            maxHeight: '100%',
            objectFit: 'contain',
            filter: b.forceWhite ? 'brightness(0) invert(1)' : 'none'
          }} 
        />
      </div>
      <span style={{ 
        fontFamily: 'Inter, sans-serif', 
        fontWeight: 800, 
        textTransform: 'uppercase', 
        letterSpacing: '0.1em',
        fontSize: '1.4rem', 
        color: 'white', 
        whiteSpace: 'nowrap' 
      }}>
        {b.name}
      </span>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      top: -100, left: -200, right: -200, bottom: -100,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8rem',
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', width: '100%' }}>
        {row1.map((b, i) => renderBrand(b, i))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', width: '100%' }}>
        {row2.map((b, i) => renderBrand(b, i))}
      </div>
    </div>
  );
}
