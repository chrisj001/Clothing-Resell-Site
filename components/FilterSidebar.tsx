"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterSidebarProps = {
  availableBrands: string[];
};

export function FilterSidebar({ availableBrands }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  useEffect(() => {
    const brands = searchParams.get('brand')?.split(',') || [];
    const eras = searchParams.get('era')?.split(',') || [];
    const conditions = searchParams.get('condition')?.split(',') || [];
    const sizes = searchParams.get('size')?.split(',') || [];
    
    setSelectedBrands(brands);
    setSelectedEras(eras);
    setSelectedConditions(conditions);
    setSelectedSizes(sizes);
  }, [searchParams]);

  const updateFilters = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length > 0) {
      params.set(key, values.join(','));
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const handleCheckboxChange = (
    value: string, 
    currentSelected: string[], 
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    filterKey: string
  ) => {
    const newSelected = currentSelected.includes(value)
      ? currentSelected.filter(item => item !== value)
      : [...currentSelected, value];
      
    setSelected(newSelected);
    updateFilters(filterKey, newSelected);
  };

  const eras = ["Modern", "Y2K", "90s", "80s", "70s"];
  const conditions = ["Brand New(BNWT)", "Excellent", "Good", "Fair", "Vintage Wear"];
  const sizes = ["S", "M", "L", "XL", "XXL"];

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#0f172a' }}>Filters</h3>
      
      {/* Brands Filter */}
      {availableBrands.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Brand</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableBrands.map(brand => (
              <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569' }}>
                <input 
                  type="checkbox" 
                  checked={selectedBrands.includes(brand)}
                  onChange={() => handleCheckboxChange(brand, selectedBrands, setSelectedBrands, 'brand')}
                  style={{ width: '16px', height: '16px', accentColor: '#0f172a' }}
                />
                {brand}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Era Filter */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Era</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {eras.map(era => (
            <label key={era} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569' }}>
              <input 
                type="checkbox" 
                checked={selectedEras.includes(era)}
                onChange={() => handleCheckboxChange(era, selectedEras, setSelectedEras, 'era')}
                style={{ width: '16px', height: '16px', accentColor: '#0f172a' }}
              />
              {era === "70s" ? "70s & Older" : era}
            </label>
          ))}
        </div>
      </div>

      {/* Condition Filter */}
      <div>
        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Condition</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conditions.map(condition => (
            <label key={condition} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#475569' }}>
              <input 
                type="checkbox" 
                checked={selectedConditions.includes(condition)}
                onChange={() => handleCheckboxChange(condition, selectedConditions, setSelectedConditions, 'condition')}
                style={{ width: '16px', height: '16px', accentColor: '#0f172a' }}
              />
              {condition}
            </label>
          ))}
        </div>
      </div>
      
      {(selectedBrands.length > 0 || selectedEras.length > 0 || selectedConditions.length > 0 || selectedSizes.length > 0) && (
        <button 
          onClick={() => {
            setSelectedBrands([]);
            setSelectedEras([]);
            setSelectedConditions([]);
            setSelectedSizes([]);
            router.push('?');
          }}
          style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
