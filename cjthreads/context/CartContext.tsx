"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  toggleCart: () => void;
  cartTotal: number;
  cartCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from local storage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cjthreads_cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("Failed to parse cart from local storage");
    }
  }, []);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save cart to local storage immediately, debounce DB sync
  useEffect(() => {
    localStorage.setItem('cjthreads_cart', JSON.stringify(items));
    
    // Clear any pending sync
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Debounce DB sync by 1 second
    syncTimerRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: existingCart } = await supabase
            .from('carts')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle();
            
          if (existingCart) {
            await supabase.from('carts').update({ items, last_updated: new Date().toISOString() }).eq('id', existingCart.id);
          } else if (items.length > 0) {
            await supabase.from('carts').insert({ user_id: session.user.id, items, status: 'active' });
          }
        }
      } catch (e) {
        console.error("Failed to sync cart to database");
      }
    }, 1000);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [items]);

  const addItem = (newItem: CartItem) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        i => i.id === newItem.id && i.size === newItem.size
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += newItem.quantity;
        return updatedItems;
      }

      return [...prevItems, newItem];
    });
    setIsCartOpen(true);
  };

  const removeItem = (id: string, size?: string) => {
    setItems(prevItems => prevItems.filter(
      i => !(i.id === id && i.size === size)
    ));
  };

  const updateQuantity = (id: string, quantity: number, size?: string) => {
    if (quantity <= 0) {
      removeItem(id, size);
      return;
    }
    
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        i => i.id === id && i.size === size
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity = quantity;
        return updatedItems;
      }
      return prevItems;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isCartOpen,
      setIsCartOpen,
      toggleCart,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
