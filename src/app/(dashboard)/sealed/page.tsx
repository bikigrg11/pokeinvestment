"use client";

import { useMemo } from "react";
import { Package, TrendingUp, Award } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SortableTable } from "@/components/ui/SortableTable";
import { MetricCard } from "@/components/ui/MetricCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCents, clr } from "@/lib/utils/formatting";

type ProductRow = Record<string, unknown> & {
  id: string;
  name: string;
  type: string;
  set: { name: string; series: string; releaseDate: Date | null };
  releasePriceC: number | null;
  currentPriceC: number | null;
  roi: number | null;
};

export default function SealedPage() {
  const { data, isLoading, isError, refetch } = trpc.sealed.list.useQuery();
  const products = useMemo(() => (data ?? []) as ProductRow[], [data]);

  const stats = useMemo(() => {
    const withRoi = products.filter((p) => p.roi != null);
    const avgRoi =
      withRoi.length > 0
        ? withRoi.reduce((s, p) => s + p.roi!, 0) / withRoi.length
        : null;
    const best = withRoi.length > 0
      ? withRoi.reduce((a, b) => (b.roi! > a.roi! ? b : a))
      : null;
    return { avgRoi, best };
  }, [products]);

  const columns = [
    {
      key: "name",
      label: "Product",
      bold: true,
      render: (row: ProductRow) => (
        <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{row.name}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row: ProductRow) => (
        <span
          style={{
            fontSize: 11,
            color: "#94a3b8",
            background: "#1e293b",
            padding: "2px 8px",
            borderRadius: 4,
            fontWeight: 600,
            whiteSpace: "nowrap" as const,
          }}
        >
          {row.type}
        </span>
      ),
    },
    {
      key: "setName",
      label: "Set",
      render: (row: ProductRow) => (
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{row.set.name}</span>
      ),
    },
    {
      key: "releaseDate",
      label: "Released",
      render: (row: ProductRow) =>
        row.set.releaseDate
          ? new Date(row.set.releaseDate).toISOString().slice(0, 10)
          : "—",
    },
    {
      key: "releasePriceC",
      label: "Release $",
      align: "right" as const,
      mono: true,
      render: (row: ProductRow) => formatCents(row.releasePriceC),
    },
    {
      key: "currentPriceC",
      label: "Current $",
      align: "right" as const,
      mono: true,
      render: (row: ProductRow) => formatCents(row.currentPriceC),
    },
    {
      key: "roi",
      label: "ROI",
      align: "right" as const,
      mono: true,
      color: (row: ProductRow) => clr(row.roi),
      render: (row: ProductRow) =>
        row.roi != null
          ? `${row.roi >= 0 ? "+" : ""}${row.roi.toFixed(1)}%`
          : "—",
    },
  ];

  if (isError) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Sealed Products</h1>
        <ErrorState message="Failed to load sealed products" onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 20px" }}>Sealed Products</h1>
        <div className="grid-3col" style={{ marginBottom: 20 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 8 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 400, borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#f1f5f9",
          margin: "0 0 20px",
        }}
      >
        Sealed Products
      </h1>

      {/* Metric cards */}
      <div className="grid-3col" style={{ marginBottom: 20 }}>
        <MetricCard
          label="Products Tracked"
          value={products.length}
          icon={Package}
        />
        <MetricCard
          label="Avg ROI"
          value={
            stats.avgRoi != null
              ? `${stats.avgRoi >= 0 ? "+" : ""}${stats.avgRoi.toFixed(1)}%`
              : "—"
          }
          color={clr(stats.avgRoi)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Best Performer"
          value={
            stats.best
              ? stats.best.name.length > 24
                ? stats.best.name.slice(0, 24) + "…"
                : stats.best.name
              : "—"
          }
          sub={
            stats.best?.roi != null
              ? `${stats.best.roi >= 0 ? "+" : ""}${stats.best.roi.toFixed(1)}% ROI`
              : undefined
          }
          icon={Award}
          mono={false}
        />
      </div>

      {products.length === 0 ? (
        <div
          style={{
            background: "#0c1222",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <Package
            size={36}
            color="#334155"
            style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }}
          />
          <p style={{ color: "#64748b", fontSize: 14, fontWeight: 500, margin: "0 0 6px" }}>
            No sealed products tracked yet
          </p>
          <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>
            Add sealed products to the database via Prisma Studio or seed script
          </p>
        </div>
      ) : (
        <SortableTable
          columns={columns as Parameters<typeof SortableTable>[0]["columns"]}
          data={products as Record<string, unknown>[]}
        />
      )}
    </div>
  );
}
