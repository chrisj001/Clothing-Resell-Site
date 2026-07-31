"use client";

import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import styles from './cart.module.css';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// Load Stripe only once
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ clientSecret, total, onSuccessfulPayment, userProfile }: { clientSecret: string, total: number, onSuccessfulPayment: (sessionId: string) => void, userProfile?: any }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Confirm Payment
    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required', // We handle redirect manually to clear cart first
    });

    if (submitError) {
      setError(submitError.message || "An unexpected error occurred.");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment successful!
      onSuccessfulPayment(paymentIntent.id);
    } else {
      // In case it needs additional actions (like 3D secure) which redirects automatically
      console.log("Payment status:", paymentIntent?.status);
    }
  };

  const mapCountryToISO = (country: string) => {
    if (!country) return '';
    const normalized = country.toLowerCase().trim();
    if (normalized === 'united kingdom' || normalized === 'uk' || normalized === 'gb' || normalized === 'great britain' || normalized === 'england') return 'GB';
    if (normalized === 'united states' || normalized === 'us' || normalized === 'usa' || normalized === 'america') return 'US';
    if (normalized === 'australia' || normalized === 'au') return 'AU';
    if (normalized === 'canada' || normalized === 'ca') return 'CA';
    if (normalized === 'ireland' || normalized === 'ie') return 'IE';
    if (normalized === 'france' || normalized === 'fr') return 'FR';
    if (normalized === 'germany' || normalized === 'de') return 'DE';
    if (normalized === 'spain' || normalized === 'es') return 'ES';
    if (normalized === 'italy' || normalized === 'it') return 'IT';
    
    if (country.length === 2) return country.toUpperCase();
    return ''; // Stripe strictly rejects the whole object if this isn't a valid ISO code
  };

  const addressOptions = {
    mode: 'shipping' as const,
    defaultValues: userProfile ? {
      name: userProfile.full_name || '',
      address: {
        line1: userProfile.address_line1 || '',
        city: userProfile.city || '',
        postal_code: userProfile.postal_code || '',
        country: mapCountryToISO(userProfile.country)
      }
    } : undefined
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Payment Details</h3>
      <div style={{ marginBottom: '1rem' }}>
        <AddressElement options={addressOptions} />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement />
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || processing} 
        className={`btn-primary ${styles.payBtn}`}
      >
        {processing ? 'Processing...' : `Pay £${total.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, cartTotal, clearCart } = useCart();
  const router = useRouter();
  
  const [discountCode, setDiscountCode] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  const [clientSecret, setClientSecret] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
        if (profile) {
          setLoyaltyPoints(profile.loyalty_points || 0);
          if (profile.use_for_checkout) setUserProfile(profile);
        }
      }
    });
  }, []);

  // Debounce fetching the payment intent when cart changes
  useEffect(() => {
    if (items.length === 0) {
      setClientSecret("");
      return;
    }

    const fetchPaymentIntent = async () => {
      setLoadingIntent(true);
      setIntentError("");
      
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartItems: items,
            discountCode: discountCode.trim(),
            redeemedPoints: pointsToRedeem,
            guestEmail: guestEmail.trim()
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize checkout');
        }
        
        setClientSecret(data.clientSecret);
        setAppliedDiscount(data.discountAmount || 0);
        setFinalPrice(data.finalPrice ?? cartTotal);
      } catch (err: any) {
        setIntentError(err.message);
        setAppliedDiscount(0);
        setFinalPrice(cartTotal);
      } finally {
        setLoadingIntent(false);
      }
    };

    // Delay the fetch slightly to allow users to finish typing email/discount
    const timeoutId = setTimeout(() => {
      fetchPaymentIntent();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [items, discountCode, guestEmail, userId, pointsToRedeem]);

  const handleSuccessfulPayment = (paymentIntentId: string) => {
    clearCart();
    router.push(`/checkout/success?session_id=${paymentIntentId}`);
  };

  if (items.length === 0) {
    return (
      <div className={styles.cartContainer} style={{ textAlign: 'center', padding: '8rem 2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your Cart is Empty</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Looks like you haven't added anything yet.</p>
        <button className="btn-primary" onClick={() => router.push('/')}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      <div className={styles.cartHeader}>
        <h1>Your Shopping Cart</h1>
        <p>Review your items and complete your purchase securely.</p>
      </div>

      <div className={styles.grid}>
        {/* Left Column: Items */}
        <div className={styles.itemsSection}>
          {items.map((item) => (
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
                    <button className={styles.quantityBtn} onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}>-</button>
                    <input 
                      type="number" 
                      className={styles.quantityInput} 
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1, item.size)}
                      min="1"
                    />
                    <button className={styles.quantityBtn} onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => removeItem(item.id, item.size)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
            <h2>Order Summary</h2>
            
            <div className={styles.summaryRow} style={{ marginTop: '1.5rem' }}>
              <span>Subtotal</span>
              <span>£{cartTotal.toFixed(2)}</span>
            </div>

            {appliedDiscount > 0 && (
              <div className={styles.summaryRow} style={{ marginTop: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                <span>Discount Applied</span>
                <span>-£{appliedDiscount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem', maxWidth: '400px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Discount Code</label>
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="e.g. WELCOME10"
                  className={styles.inputField}
                />
              </div>
            </div>

            {userId && loyaltyPoints > 0 && (
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem', maxWidth: '400px', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span>Redeem Points</span>
                  <span style={{ color: 'var(--color-teal)' }}>{loyaltyPoints} Available</span>
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.min(loyaltyPoints, Math.floor(cartTotal * 100))}
                    step="100"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-teal)' }}
                  />
                  <span style={{ fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                    -£{(pointsToRedeem / 100).toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  {pointsToRedeem > 0 ? `Redeeming ${pointsToRedeem} points` : 'Slide to redeem points for cash back'}
                </div>
              </div>
            )}

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Total</span>
              <span>£{finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Stripe Elements */}
        <div className={styles.checkoutSection}>
          <h2>Secure Checkout</h2>

          {!userId && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Email Address</label>
              <input 
                type="email" 
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="For your receipt"
                className={styles.inputField}
                style={{ width: '100%' }}
              />
              {!guestEmail && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>Email is required for guest checkout.</div>}
            </div>
          )}

          {intentError && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {intentError}
            </div>
          )}

          {loadingIntent ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              Loading secure checkout...
            </div>
          ) : clientSecret && (!userId ? guestEmail : true) ? (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <CheckoutForm 
                  clientSecret={clientSecret} 
                  total={finalPrice} 
                  onSuccessfulPayment={handleSuccessfulPayment} 
                  userProfile={userProfile}
                />
              </Elements>
            </div>
          ) : null}
          
        </div>
      </div>
    </div>
  );
}
