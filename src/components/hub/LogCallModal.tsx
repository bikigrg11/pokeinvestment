"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const FIELD = {
  width: "100%", background: "var(--bg-panel-2)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", marginTop: 4,
};

export function LogCallModal({ entryId, onClose, onLogged }: { entryId: string; onClose: () => void; onLogged: () => void }) {
  const [query, setQuery] = useState("");
  const [cardId, setCardId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: results } = trpc.cards.search.useQuery(
    { q: query, limit: 8 },
    { enabled: query.trim().length >= 2 }
  );

  const log = trpc.creators.logCall.useMutation({
    onSuccess: onLogged,
    onError: (e) => setError(e.message || "Failed to log call"),
  });

  const submit = () => {
    setError(null);
    if (!cardId) return setError("Pick a card first");
    log.mutate({ entryId, cardId, sourceUrl: sourceUrl.trim() || undefined });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, width: 440, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>Log a call</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}><X size={18} /></button>
        </div>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          Search a card
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCardId(null); }} style={FIELD} />
        </label>

        {query.trim().length >= 2 && (results ?? []).length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
            {(results ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCardId(c.id); setQuery(c.name); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: cardId === c.id ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent", color: "var(--text)", border: "none", padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 12 }}>
          Source URL (video/post, optional)
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" style={FIELD} />
        </label>

        {error && <p style={{ color: "var(--neg)", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button onClick={submit} disabled={log.isPending} style={{ width: "100%", marginTop: 18, background: "var(--accent)", color: "var(--bg-panel-2)", border: "none", borderRadius: 6, padding: "10px", fontWeight: 700, cursor: "pointer" }}>
          {log.isPending ? "Logging…" : "Log bullish call"}
        </button>
      </div>
    </div>
  );
}
