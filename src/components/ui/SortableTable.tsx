"use client";

import { useState, useMemo } from "react";

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

export function SortableTable<T extends Record<string, unknown>>({
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
          border: "1px solid #1e293b",
          borderRadius: 8,
          padding: "40px 20px",
          textAlign: "center",
          color: "#475569",
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
        borderRadius: 8,
        border: "1px solid #1e293b",
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
                    background: "#0c1222",
                    borderBottom: "2px solid #1e293b",
                    color: "#64748b",
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
                borderBottom: "1px solid #1e293b22",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "#1e293b44";
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
                      color: col.color ? col.color(row) : "#cbd5e1",
                      textAlign: col.align ?? "left",
                      fontFamily: col.mono
                        ? "'JetBrains Mono', 'SF Mono', monospace"
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
