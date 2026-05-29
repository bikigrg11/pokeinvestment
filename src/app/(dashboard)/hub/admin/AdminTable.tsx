"use client";

import { trpc } from "@/lib/trpc/client";
import { ErrorState } from "@/components/ui/ErrorState";

const PANEL = { background: "#0c1222", border: "1px solid #1e293b", borderRadius: 8, padding: 20 };
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export function AdminTable() {
  const utils = trpc.useUtils();
  const { data, isLoading, isError, refetch } = trpc.creators.adminList.useQuery();
  const setStatus = trpc.creators.adminSetStatus.useMutation({
    onSuccess: () => utils.creators.adminList.invalidate(),
  });

  return (
    <div className="main-content" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Hub Admin</h1>
      {isError ? (
        <ErrorState message="Failed to load entries." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div style={PANEL}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 6 }} />)}
        </div>
      ) : (
        <div style={{ ...PANEL, padding: 0 }}>
          {(data ?? []).map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #1e293b" }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: "#f1f5f9", fontSize: 14 }}>{e.name}</span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{labelFor(e.category)}</span>
              </div>
              <span style={{ fontSize: 11, color: e.status === "live" ? "#22c55e" : "#ef4444" }}>{e.status}</span>
              <button
                onClick={() => setStatus.mutate({ entryId: e.id, status: e.status === "live" ? "hidden" : "live" })}
                style={{ background: "#0a0f1c", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 12px", color: "#cbd5e1", fontSize: 12, cursor: "pointer" }}
              >
                {e.status === "live" ? "Hide" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
