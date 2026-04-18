"use client";

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}

export function Panel({ children, title, action, padding = 20, style }: PanelProps) {
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              margin: 0,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
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
