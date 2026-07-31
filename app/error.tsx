"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
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
        Something went wrong
      </h2>
      <p style={{ color: "#64748b", marginBottom: "2rem", maxWidth: "400px" }}>
        We hit an unexpected error. Please try again, or head back to the homepage.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
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
        <a
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f1f5f9",
            color: "#0f172a",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
