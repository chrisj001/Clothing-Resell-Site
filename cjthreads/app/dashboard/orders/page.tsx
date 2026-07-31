"use client";

import styles from "../dashboard.module.css";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import DashboardSidebar from "../../../components/DashboardSidebar";

export default function CustomerOrders() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState("");
  const [reviewProductName, setReviewProductName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUserProfile(session.user);

      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', session.user.id)
          .order('created_at', { ascending: false });

        if (ordersData) {
          setOrders(ordersData);
        }

        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('product_id')
          .eq('customer_id', session.user.id);

        if (reviewsData) {
          setReviewedProductIds(reviewsData.map(r => r.product_id));
        }
      } catch (err) {
        console.error("Orders fetch error", err);
      }
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const openReviewModal = (productId: string, productName: string) => {
    setReviewProductId(productId);
    setReviewProductName(productName);
    setRating(5);
    setComment("");
    setReviewMessage("");
    setIsReviewModalOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewMessage("");

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reviewProductId,
          customerId: userProfile.id,
          rating,
          comment
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setReviewMessage("Success! Review published. 50 points added!");
      setReviewedProductIds(prev => [...prev, reviewProductId]);
      setTimeout(() => setIsReviewModalOpen(false), 2000);
    } catch (err: any) {
      setReviewMessage("Error: " + err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Loading your secure dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <DashboardSidebar activeLink="orders" />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1>Order History</h1>
            <p>View and track all your previous purchases.</p>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '3rem', backgroundColor: '#cbd5e1', borderRadius: '8px', textAlign: 'center', border: '1px dashed #94a3b8' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Orders Yet</h3>
              <p style={{ color: '#475569' }}>You haven't placed any orders yet. Start shopping!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {orders.map(order => (
                <div key={order.id} style={{ padding: '1.5rem', backgroundColor: '#cbd5e1', borderRadius: '8px', border: '1px solid #94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>Order #{order.order_number || order.id.split('-')[0]}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>Placed on {new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1.1rem' }}>£{order.total_amount.toFixed(2)}</strong>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        marginTop: '0.25rem',
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        backgroundColor: order.status === 'pending' ? '#fef3c7' : '#dcfce3',
                        color: order.status === 'pending' ? '#b45309' : '#166534',
                        textTransform: 'capitalize',
                        fontWeight: 500
                      }}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#475569' }}>Items Purchased</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(order.items || []).map((item: any, idx: number) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', paddingBottom: '0.5rem', borderBottom: idx !== order.items.length - 1 ? '1px dashed #94a3b8' : 'none' }}>
                          <div>
                            <span>{item.quantity}x {item.name} {item.size ? `(Size: ${item.size})` : ''}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontWeight: 500 }}>£{(item.price * item.quantity).toFixed(2)}</span>
                            {/* Allow reviewing if item has an ID (wasn't a custom line item without product id) */}
                            {item.id && (
                              reviewedProductIds.includes(item.id) ? (
                                <span style={{ fontSize: '0.8rem', color: '#166534', backgroundColor: '#dcfce3', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 500 }}>
                                  ✓ Thanks, your review has been left on the products
                                </span>
                              ) : (
                                <button 
                                  onClick={() => openReviewModal(item.id, item.name)}
                                  style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #cbd5e1',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    color: '#0f172a'
                                  }}
                                >
                                  Leave Review
                                </button>
                              )
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Review Product</h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{reviewProductName}</p>

            {reviewMessage && (
              <div style={{ 
                padding: '0.75rem', 
                marginBottom: '1rem',
                borderRadius: '4px',
                backgroundColor: reviewMessage.startsWith('Error') ? '#fee2e2' : '#dcfce3',
                color: reviewMessage.startsWith('Error') ? '#b91c1c' : '#166534',
                fontSize: '0.9rem'
              }}>
                {reviewMessage}
              </div>
            )}

            {!reviewMessage.includes('Success') && (
              <form onSubmit={submitReview}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Rating</label>
                  <select 
                    value={rating} 
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={5}>⭐️⭐️⭐️⭐️⭐️ (5) Excellent</option>
                    <option value={4}>⭐️⭐️⭐️⭐️ (4) Good</option>
                    <option value={3}>⭐️⭐️⭐️ (3) Okay</option>
                    <option value={2}>⭐️⭐️ (2) Poor</option>
                    <option value={1}>⭐️ (1) Terrible</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comment (Optional)</label>
                  <textarea 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', minHeight: '80px' }}
                    placeholder="What did you think of the fit and quality?"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsReviewModalOpen(false)}
                    style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={reviewLoading}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {reviewLoading ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
