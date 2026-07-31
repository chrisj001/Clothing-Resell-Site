"use client";

import React, { useState, useEffect } from "react";

export default function DropCountdown({ dropDateStr }: { dropDateStr: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const dropDate = new Date(dropDateStr).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = dropDate - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dropDateStr]);

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
      color: 'white',
      padding: '3.5rem 2.5rem',
      borderRadius: '16px',
      margin: '1rem auto',
      maxWidth: '825px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem'
    }}>
      <h2 style={{ color: '#fde047', margin: 0, fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, whiteSpace: 'nowrap' }}>
        Next Drop In
      </h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '2rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Mins', value: timeLeft.minutes },
            { label: 'Secs', value: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#1e293b',
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                fontSize: '2.5rem',
                fontWeight: '900',
                color: 'white',
                boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
                marginBottom: '0.5rem',
                border: '1px solid #334155'
              }}>
                {item.value.toString().padStart(2, '0')}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', flex: 1, minWidth: '350px', gap: '0.5rem' }}>
          <input 
            type="email" 
            placeholder="Enter email to get notified" 
            style={{ 
              flex: 1, padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', outline: 'none', fontSize: '1rem' 
            }} 
          />
          <button className="btn-primary" style={{ backgroundColor: '#fde047', color: '#0f172a', fontWeight: 'bold', padding: '0.85rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => alert('Thanks! We will notify you.')}>
            Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}
