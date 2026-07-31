"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app/layout.module.css';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form className={styles.searchBar} onSubmit={handleSearch}>
      <input 
        type="text" 
        placeholder="Search..." 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" aria-label="Search">🔍</button>
    </form>
  );
}
