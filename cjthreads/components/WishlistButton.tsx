"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WishlistButtonProps {
  productId: string;
  initialIsWishlisted?: boolean;
}

export function WishlistButton({ productId, initialIsWishlisted = false }: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        if (!initialIsWishlisted) {
          const { data } = await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .single();
          if (data) setIsWishlisted(true);
        }
      }
    };
    checkUser();
  }, [productId, initialIsWishlisted]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("Please log in to save items to your wishlist.");
      return;
    }

    setLoading(true);
    if (isWishlisted) {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      
      if (!error) setIsWishlisted(false);
    } else {
      const { error } = await supabase
        .from('wishlists')
        .insert({ user_id: userId, product_id: productId });
      
      if (!error) setIsWishlisted(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10,
        transition: 'transform 0.2s',
        transform: isWishlisted ? 'scale(1.1)' : 'scale(1)',
      }}
      title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill={isWishlisted ? "#ef4444" : "none"} 
        stroke={isWishlisted ? "#ef4444" : "currentColor"} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        style={{ width: '20px', height: '20px', transition: 'fill 0.2s, stroke 0.2s' }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    </button>
  );
}
