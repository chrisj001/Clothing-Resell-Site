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
      <a href={profileUrl} style={{ textDecoration: 'none', color: 'var(--color-white)', display: 'flex', alignItems: 'center' }} title="Profile">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </a>
      
      <Link href="/cart" style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--color-white)',
          cursor: 'pointer',
          position: 'relative',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center'
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
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
            border: '1px solid var(--color-white)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-white)',
            cursor: 'pointer',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            marginLeft: '0.5rem'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-white)'; e.currentTarget.style.color = 'var(--color-teal-dark)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-white)'; }}
          title="Log out"
        >
          Logout
        </button>
      )}
    </>
  );
}
