"use client";

import React from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", color: "#0f172a", marginBottom: "1rem" }}>
        Admin Error
      </h2>
      <p style={{ color: "#64748b", marginBottom: "2rem", maxWidth: "400px" }}>
        Something went wrong loading this admin page. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#008080",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Try Again
      </button>
    </div>
  );
}
