"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useCart } from "../../../context/CartContext";
import styles from "./success.module.css";

export default function CheckoutSuccessPage() {
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart since checkout was successful
    clearCart();

    // Read URL params
    const params = new URLSearchParams(window.location.search);
    const directOrderNum = params.get('order_number');
    const sessionId = params.get('session_id') || params.get('payment_intent');

    if (directOrderNum) {
      setOrderNumber(directOrderNum);
    } else if (sessionId) {
      // Poll the database to get the order number from the session ID
      // since the webhook might take a second to create it.
      let attempts = 0;
      const fetchOrder = async () => {
        try {
          const res = await fetch(`/api/orders/success?session_id=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.order_number) {
              setOrderNumber(data.order_number);
              return;
            }
          }
        } catch (e) {
          console.error("Error fetching order:", e);
        }
        
        attempts++;
        if (attempts < 10) {
          setTimeout(fetchOrder, 1500); // Try again in 1.5 seconds
        }
      };
      
      fetchOrder();
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsGuest(false);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return null;

  return (
    <div className={styles.successContainer}>
      <div className={styles.successCard}>
        <div className={styles.checkIcon}>✓</div>
        <h1 className={styles.title}>Order Confirmed!</h1>
        {orderNumber ? (
          <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '6px', margin: '1rem 0', fontWeight: 'bold', color: '#0f172a' }}>
            Order Number: #{orderNumber}
          </div>
        ) : (
          <div style={{ padding: '0.75rem', margin: '1rem 0', color: '#64748b' }}>
            Generating order number...
          </div>
        )}
        <p className={styles.message}>
          Thank you for shopping with CJThreads. We've received your order and are getting it ready for shipment.
        </p>

        {isGuest ? (
          <div className={styles.guestPrompt}>
            <h2>You earned points on this purchase!</h2>
            <p>Don't let them go to waste. Create an account now to claim your loyalty points and track your order.</p>
            <Link href="/login?mode=signup" className="btn-primary" style={{ display: 'block', marginTop: '1rem' }}>
              Join Now to Redeem Points
            </Link>
          </div>
        ) : (
          <div className={styles.userPrompt}>
            <p>Your loyalty points have been added to your account!</p>
            <Link href="/dashboard" className="btn-primary" style={{ display: 'block', marginTop: '1rem' }}>
              View My Dashboard
            </Link>
          </div>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
