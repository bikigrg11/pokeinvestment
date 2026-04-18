"use client";

import { useState, useMemo, memo } from "react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  mono?: boolean;
  bold?: boolean;
  color?: (row: T) => string;
  render?: (row: T) => React.ReactNode;
}

interface SortableTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  maxHeight?: number;
  emptyMessage?: string;
}

function SortableTableInner<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  maxHeight = 600,
  emptyMessage = "No data",
}: SortableTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol as keyof T];
      const bv = b[sortCol as keyof T];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("desc");
    }
  };

  if (data.length === 0) {
    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        overflowY: "auto",
        overflowX: "auto",
        maxHeight,
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
          <tr>
            {columns.map((col) => {
              const key = String(col.key);
              const isSorted = sortCol === key;
              const sortable = col.sortable !== false;
              return (
                <th
                  key={key}
                  onClick={() => sortable && toggleSort(key)}
                  style={{
                    padding: "10px 14px",
                    background: "var(--bg-panel)",
                    borderBottom: "2px solid var(--border)",
                    color: "var(--text-3)",
                    textAlign: col.align ?? "left",
                    cursor: sortable ? "pointer" : "default",
                    fontWeight: 600,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                  {isSorted ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                borderBottom: "1px solid color-mix(in srgb, var(--border) 30%, transparent)",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "color-mix(in srgb, var(--accent) 5%, transparent)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
              }}
            >
              {columns.map((col) => {
                const key = String(col.key);
                return (
                  <td
                    key={key}
                    style={{
                      padding: "10px 14px",
                      color: col.color ? col.color(row) : "var(--text-2)",
                      textAlign: col.align ?? "left",
                      fontFamily: col.mono
                        ? "var(--font-mono)"
                        : "inherit",
                      fontWeight: col.bold ? 600 : 400,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.render ? col.render(row) : String(row[key as keyof T] ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Cast preserves the generic type parameter through memo
export const SortableTable = memo(SortableTableInner) as typeof SortableTableInner;
