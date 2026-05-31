"use client";

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
  titleAlign?: "left" | "center";
}

export function Panel({ children, title, action, padding = 20, style, titleAlign = "left" }: PanelProps) {
  const centered = titleAlign === "center";
  // When the panel has no body padding (e.g. lists), a centered title gets its own
  // padding + divider so it reads as an intentional header instead of hugging the edge.
  const bannerHeader = centered && padding === 0;

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding,
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            justifyContent: centered ? "center" : "space-between",
            alignItems: "center",
            marginBottom: bannerHeader ? 0 : 14,
            ...(bannerHeader ? { padding: "14px 16px", borderBottom: "1px solid var(--border)" } : {}),
          }}
        >
          <h3
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              margin: 0,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              textAlign: centered ? "center" : "left",
            }}
          >
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
