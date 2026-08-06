"use client";

import { useState, useEffect } from "react";
import styles from "../login/login.module.css";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Math Captcha
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState("");

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaInput("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (parseInt(captchaInput) !== (captchaNum1 + captchaNum2)) {
        throw new Error("Incorrect math captcha. Are you a robot?");
      }

      // We need to pass a redirectTo URL so the user comes back to our specific reset page
      const resetUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/reset-password` 
        : 'http://localhost:3000/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });

      if (error) throw error;

      setSuccess("If that email is registered, you will receive a password reset link shortly.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className={styles.loginContainer} style={{ paddingTop: '8rem', paddingBottom: '8rem' }}>
        <div className={styles.loginCard} style={{ maxWidth: '500px' }}>
          <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>Reset Password</h1>
          <p style={{ color: '#64748b', marginBottom: '2rem', textAlign: 'center' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {!success && (
            <form onSubmit={handleSubmit}>
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
                    required
                    style={{ flex: 1, backgroundColor: 'white' }}
                    placeholder="?"
                  />
                </div>
              </div>

              <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ marginTop: '2rem' }}>
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link href="/login" style={{ color: 'var(--color-teal)', fontWeight: 600, textDecoration: 'none' }}>
              &larr; Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
