"use client";

import { useState, useEffect } from "react";
import styles from "./login.module.css";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Math Captcha
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");
  
  // Referral
  const [refCode, setRefCode] = useState<string | null>(null);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1); // 1 to 10
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1); // 1 to 10
    setCaptchaInput("");
  };

  // Run on mount and when switching modes
  useEffect(() => {
    generateCaptcha();
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('mode') === 'signup') {
        setIsLogin(false);
      }
      const ref = searchParams.get('ref');
      if (ref) {
        setRefCode(ref);
        setIsLogin(false); // Automatically switch to signup if there's a ref code
      }
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate Math Captcha for Sign Up
      if (!isLogin) {
        if (parseInt(captchaInput) !== (captchaNum1 + captchaNum2)) {
          throw new Error("Incorrect math captcha. Are you a robot?");
        }
        if (!fullName.trim()) {
           throw new Error("Please enter your full name.");
        }
      }

      if (isLogin) {
        // Sign In Flow
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profile?.role === 'admin' || profile?.role === 'seller') {
            window.location.href = "/admin";
          } else {
            window.location.href = "/dashboard";
          }
        }
      } else {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              referred_by: refCode
            }
          }
        });
        
        if (error) {
           // Provide clearer error message for existing users
           if (error.message.includes('already registered') || error.message.includes('already exists')) {
              throw new Error("An account with this email address already exists.");
           }
           throw error;
        }
        
        // Trigger Welcome Email & Auto-generated discount code
        if (data?.user) {
          try {
            await fetch('/api/emails/welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: email, 
                userId: data.user.id,
                fullName: fullName.trim()
              })
            });
          } catch (e) {
            console.error("Failed to trigger welcome email:", e);
          }
        }
        
        setSuccess("Account successfully created! Please check your email for the confirmation link.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
      // Regenerate captcha on failure so bots can't guess
      if (!isLogin) generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.title}>{isLogin ? "Welcome Back" : "Create an Account"}</h1>
          
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="fullName">Full Name</label>
                <input 
                  type="text" 
                  id="fullName" 
                  className={styles.input} 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="e.g. Jane Doe"
                />
              </div>
            )}
          
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                className={styles.input} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <Link href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-teal)', fontWeight: 500, textDecoration: 'none' }}>
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>

            {/* Math Captcha Security check for Signups */}
            {!isLogin && (
              <div className={styles.formGroup} style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <label className={styles.label} style={{ color: '#0f172a', fontWeight: 600 }}>Security Check</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {captchaNum1} + {captchaNum2} = 
                  </span>
                  <input 
                    type="number" 
                    className={styles.input}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required={!isLogin}
                    style={{ flex: 1, backgroundColor: 'white' }}
                    placeholder="?"
                  />
                </div>
              </div>
            )}

            <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ marginTop: isLogin ? '1rem' : '2rem' }}>
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
            </button>
          </form>

          <div className={styles.toggleMode}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} type="button">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
