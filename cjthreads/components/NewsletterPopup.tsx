"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Check if user already saw or closed the popup
    const hasSeenPopup = localStorage.getItem("cjthreads_newsletter_seen");
    
    if (!hasSeenPopup) {
      // Wait 5 seconds before showing
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    localStorage.setItem("cjthreads_newsletter_seen", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus("loading");
    
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email });
        
      if (error) {
        if (error.message.includes('unique')) {
          throw new Error("This email is already subscribed!");
        }
        throw error;
      }
      
      setStatus("success");
      localStorage.setItem("cjthreads_newsletter_seen", "true");
      
      // Auto close after 3 seconds of success
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to subscribe. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      width: '100%',
      maxWidth: '400px',
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      animation: 'slideUp 0.5s ease-out forwards'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      <button 
        onClick={closePopup}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          fontSize: '1.25rem',
          cursor: 'pointer',
          padding: '0.25rem'
        }}
        aria-label="Close"
      >
        &times;
      </button>

      {status === "success" ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fde047' }}>You're in! 🎉</h3>
          <p style={{ color: '#cbd5e1' }}>Use code <strong>WELCOME10</strong> at checkout for 10% off your first order.</p>
        </div>
      ) : (
        <>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fde047' }}>Get 10% Off</h3>
          <p style={{ color: '#cbd5e1', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Join our newsletter for exclusive vintage drops, style guides, and 10% off your first purchase.
          </p>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: 'none',
                width: '100%',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            
            {status === "error" && (
              <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{errorMessage}</div>
            )}
            
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#008080',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: status === "loading" ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: status === "loading" ? 0.7 : 1
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#006666'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#008080'}
            >
              {status === "loading" ? "Subscribing..." : "Subscribe & Get 10% Off"}
            </button>
          </form>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '1rem' }}>
            We respect your privacy. Unsubscribe at any time.
          </div>
        </>
      )}
    </div>
  );
}
