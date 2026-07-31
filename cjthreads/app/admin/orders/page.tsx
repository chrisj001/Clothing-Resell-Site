"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import dashboardStyles from "../../dashboard/dashboard.module.css";
import adminStyles from "../admin.module.css";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setOrders(data);
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
      
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (!error) {
      setOrders(orders.filter(o => o.id !== orderId));
    } else {
      alert("Failed to delete order: " + error.message);
    }
  };

  if (loading) return null;

  return (
    <div className="container">
      <div className={adminStyles.adminContainer}>
        {/* Sidebar */}
        <aside className={dashboardStyles.sidebar}>
          <nav>
            <a href="/admin">Overview</a>
            <a href="/admin/analytics">Analytics</a>
            <a href="/admin/products">My Inventory</a>
            <a href="/admin/orders" className={dashboardStyles.activeLink}>All Orders</a>
            <a href="/admin/discounts">Discount Codes</a>
            <a href="/admin/abandoned-carts">Abandoned Carts</a>
            <a href="/admin/users">User Management</a>
            <a href="/admin/settings">Store Settings</a>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-teal-light)',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                marginTop: '1rem',
                borderRadius: '4px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-teal)'; e.currentTarget.style.color = 'var(--color-white)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-teal-light)'; }}
            >
              Log Out
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className={dashboardStyles.mainContent}>
          <div className={dashboardStyles.header}>
            <h1>Order Management</h1>
            <p>View and manage customer orders.</p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            {orders.length === 0 ? (
              <div style={{ padding: '3rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>No Orders Yet</h2>
                <p style={{ color: '#475569' }}>When customers check out, their orders will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {orders.map(order => (
                  <div key={order.id} style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Order #{order.order_number || order.id.split('-')[0]}</h3>
                        <div style={{ color: '#475569', fontSize: '0.9rem' }}>
                          {new Date(order.created_at).toLocaleString()} • {order.customer_email || (order.customer_id ? 'Registered User' : 'Guest Checkout')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>£{order.total_amount.toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: order.status === 'paid' ? '#eafaf1' : '#f8fafc' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid (Unfulfilled)</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                          <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}
                            title="Delete Order"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#475569' }}>Items</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {(order.items || []).map((item: any, idx: number) => (
                            <li key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                              {item.quantity}x {item.name} {item.size ? `(Size: ${item.size})` : ''} - £{item.price.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (order.shipping_address.line1 || order.shipping_address.city) && (
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#475569' }}>Shipping Address</h4>
                          <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                            {order.shipping_address.line1}<br />
                            {order.shipping_address.line2 && <>{order.shipping_address.line2}<br /></>}
                            {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
                            {order.shipping_address.country}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
