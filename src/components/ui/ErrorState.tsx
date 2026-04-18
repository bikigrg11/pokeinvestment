"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Failed to load data", onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <AlertTriangle size={32} color="var(--neg)" style={{ marginBottom: 12 }} />
      <p style={{ color: "var(--neg)", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
        {message}
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 12, margin: "0 0 16px" }}>
        Check your connection or try again
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "7px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-2)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
