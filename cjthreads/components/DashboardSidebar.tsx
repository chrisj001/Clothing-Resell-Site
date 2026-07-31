"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import styles from "../app/dashboard/dashboard.module.css"; 

export default function DashboardSidebar({ activeLink }: { activeLink: string }) {
  const router = useRouter();
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('is_seller').eq('id', session.user.id).single();
        if (data?.is_seller) setIsSeller(true);
      }
    };
    checkUser();
  }, []);

  return (
    <aside className={styles.sidebar}>
      <nav>
        <a href="/dashboard" className={activeLink === "overview" ? styles.activeLink : ""}>Overview</a>
        <a href="/dashboard/orders" className={activeLink === "orders" ? styles.activeLink : ""}>My Orders</a>
        <a href="/dashboard/wishlist" className={activeLink === "wishlist" ? styles.activeLink : ""}>My Wishlist</a>
        <a href="/dashboard/community" className={activeLink === "community" ? styles.activeLink : ""}>Community & Fits</a>
        <a href="/dashboard/referrals" className={activeLink === "referrals" ? styles.activeLink : ""}>Refer & Earn</a>
        <a href="/dashboard/profile" className={activeLink === "profile" ? styles.activeLink : ""}>Profile & Preferences</a>
        <a href="/dashboard/loyalty" className={activeLink === "loyalty" ? styles.activeLink : ""}>Loyalty Points</a>
        <a href="/dashboard/settings" className={activeLink === "settings" ? styles.activeLink : ""}>Settings</a>
        {isSeller && (
          <a href="/dashboard/seller" className={activeLink === "seller" ? styles.activeLink : ""} style={{ color: activeLink === "seller" ? 'inherit' : '#f59e0b', fontWeight: 'bold' }}>Seller Portal</a>
        )}
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-teal-light)',
            padding: '0.75rem 1rem',
            textAlign: 'left',
            width: '100%',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 600,
            marginTop: '1rem',
            borderRadius: '4px'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-teal)'; e.currentTarget.style.color = 'var(--color-white)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-teal-light)'; }}
        >
          Log Out
        </button>
      </nav>
    </aside>
  );
}
