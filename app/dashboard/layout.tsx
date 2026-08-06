import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#5c636f', minHeight: 'calc(100vh - 80px - 100px)' }}>
      {children}
    </div>
  );
}
