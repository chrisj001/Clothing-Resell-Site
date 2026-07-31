"use client";

import React, { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function BannedScreen() {
  useEffect(() => {
    const enforceBan = async () => {
      // Set a persistent cookie to ban this browser (expires in 10 years)
      document.cookie = "browser_banned=true; path=/; max-age=315360000";
      
      // Forcefully sign them out so their session is destroyed on the client
      await supabase.auth.signOut();
    };
    
    enforceBan();
  }, []);

  return (
    <div style={{ backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', margin: 0, fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1e293b', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', border: '1px solid #334155' }}>
        <h1 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Access Denied</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '400px', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Your account has been permanently suspended due to violations of our terms of service. You are no longer permitted to access this site.
        </p>
      </div>
    </div>
  );
}
