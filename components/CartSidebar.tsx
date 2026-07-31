"use client";

import React, { useState } from 'react';
import styles from './cart.module.css';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

export function CartSidebar() {
  const [discountCode, setDiscountCode] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { 
    items, 
    removeItem, 
    updateQuantity, 
    clearCart,
    isCartOpen, 
    setIsCartOpen, 
    cartTotal 
  } = useCart();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id || null));
  }, [isCartOpen]);

  const handleCheckout = async () => {
    setLoading(true);
    setMessage("");

    try {
      if (!userId && !guestEmail) {
        throw new Error("Please enter your email address for the receipt.");
      }

      // In Phase 3/10, we send the entire array of items to the checkout route
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: items,
          discountCode: discountCode.trim(),
          guestEmail: guestEmail.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.url) {
        clearCart();
        window.location.href = data.url;
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`${styles.sidebarOverlay} ${isCartOpen ? styles.open : ''}`} 
        onClick={() => setIsCartOpen(false)}
      ></div>
      
      <div className={`${styles.sidebar} ${isCartOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button className={styles.closeBtn} onClick={() => setIsCartOpen(false)}>×</button>
        </div>
        
        <div className={styles.cartItems}>
          {items.length === 0 ? (
            <div className={styles.emptyCart}>
              <p>Your cart is empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.size}`} className={styles.cartItem}>
                <div 
                  className={styles.itemImage}
                  style={item.image ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                ></div>
                <div className={styles.itemDetails}>
                  <div className={styles.itemName}>{item.name}</div>
                  {item.size && <div className={styles.itemSize}>Size: {item.size}</div>}
                  <div className={styles.itemPrice}>£{item.price.toFixed(2)}</div>
                  
                  <div className={styles.itemActions}>
                    <div className={styles.quantityControl}>
                      <button 
                        className={styles.quantityBtn}
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                      >-</button>
                      <input 
                        type="number" 
                        className={styles.quantityInput} 
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1, item.size)}
                        min="1"
                      />
                      <button 
                        className={styles.quantityBtn}
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                      >+</button>
                    </div>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.id, item.size)}
                    >Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {items.length > 0 && (
          <div className={styles.footer}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Discount code (e.g. WELCOME10)"
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-gray)', fontSize: '0.9rem' }}
                />
              </div>
              
              {!userId && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input 
                    type="email" 
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Email address for order"
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-gray)', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              {message && <div style={{ marginTop: '0.5rem', color: message.startsWith('Error') ? '#d9534f' : 'green', fontSize: '0.85rem' }}>{message}</div>}
            </div>

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Total</span>
              <span>£{cartTotal.toFixed(2)}</span>
            </div>
            <button 
              className={`btn-primary ${styles.checkoutBtn}`} 
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? "Processing..." : "Proceed to Checkout"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
