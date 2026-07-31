"use client";

import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export function HeaderActions() {
  const { cartCount } = useCart();
  const [profileUrl, setProfileUrl] = useState('/login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async (session: any) => {
      if (session) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role === 'admin' || profile?.role === 'seller') {
          setProfileUrl('/admin');
        } else {
          setProfileUrl('/dashboard');
        }
      } else {
        setIsLoggedIn(false);
        setProfileUrl('/login');
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUser(session);
    });

    // Listen for auth changes (e.g. login/logout in other tabs or components)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <a href={profileUrl} style={{ textDecoration: 'none', fontSize: '1.2rem' }} title="Profile">👤</a>
      
      <Link href="/cart" style={{ 
          background: 'none', 
          border: 'none', 
          fontSize: '1.2rem', 
          cursor: 'pointer',
          position: 'relative',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}>
        🛒
        {cartCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: 'var(--color-teal)',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {cartCount}
          </span>
        )}
      </Link>

      {isLoggedIn && (
        <button 
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            marginLeft: '0.5rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
          title="Log out"
        >
          Logout
        </button>
      )}
    </>
  );
}
