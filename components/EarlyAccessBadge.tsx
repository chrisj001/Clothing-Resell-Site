"use client";

import React, { useState, useEffect } from 'react';

interface EarlyAccessBadgeProps {
  createdAt: string;
  userTier: string;
  exempt?: boolean;
}

export function EarlyAccessBadge({ createdAt, userTier, exempt }: EarlyAccessBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // If product is exempt or user is Bronze, don't show the badge
    if (exempt) return;
    if (userTier !== 'Gold' && userTier !== 'Silver') return;

    const createdTime = new Date(createdAt).getTime();
    
    // Total early access period is 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const expiresAt = createdTime + twentyFourHours;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft(null);
        setShouldRender(false);
        return;
      }

      // Silver has an 8-hour window (they see items with <= 8h remaining)
      const eightHours = 8 * 60 * 60 * 1000;
      if (userTier === 'Silver' && remaining > eightHours) {
         setShouldRender(false);
         return; 
      }

      setShouldRender(true);
      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeLeft({ h, m, s });
    };

    // Run immediately once
    updateTimer();

    // Then run every second
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt, userTier, exempt]);

  // Don't render until client-side hydration sets the timer to prevent mismatch
  if (!shouldRender || !timeLeft) return null;

  const isGold = userTier === 'Gold';
  
  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      left: '12px',
      backgroundColor: isGold ? '#fef08a' : '#f8fafc',
      color: isGold ? '#854d0e' : '#475569',
      border: isGold ? '1px solid #eab308' : '1px solid #cbd5e1',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 10
    }}>
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>
        ★
      </span>
      <span>
        VIP {isGold ? 'Gold' : 'Silver'} | {timeLeft.h.toString().padStart(2, '0')}h {timeLeft.m.toString().padStart(2, '0')}m {timeLeft.s.toString().padStart(2, '0')}s
      </span>
    </div>
  );
}
