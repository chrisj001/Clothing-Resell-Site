"use client";

import { useState, useEffect } from "react";
import styles from "../login/login.module.css";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // When the user clicks the email link, Supabase redirects here and sets the session in the URL hash.
    // The supabase-js client automatically parses this hash and establishes the session.
    // We just need to verify they actually have an active session before allowing a password reset.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Invalid or expired password reset link. Please try again.");
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess("Your password has been successfully updated! Redirecting to login...");
      
      // Sign them out so they can log back in freshly with the new password
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className={styles.loginContainer} style={{ paddingTop: '8rem', paddingBottom: '8rem' }}>
        <div className={styles.loginCard} style={{ maxWidth: '500px' }}>
          <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>Set New Password</h1>
          
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {!success && !error?.includes("expired") && (
            <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="password">New Password</label>
                <input 
                  type="password" 
                  id="password" 
                  className={styles.input} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  className={styles.input} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ marginTop: '2rem' }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {error?.includes("expired") && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <a href="/forgot-password" style={{ color: 'var(--color-teal)', fontWeight: 600, textDecoration: 'none' }}>
                &larr; Request a new link
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
