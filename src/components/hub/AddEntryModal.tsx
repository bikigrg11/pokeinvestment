"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const CATEGORIES = [
  "YOUTUBER", "SOCIAL_CREATOR", "STREAMER_BREAKER", "INVESTOR_X", "PODCAST",
  "MARKETPLACE", "LGS", "GROUP_BREAK", "GRADING", "AUTHENTICATION",
  "TOOL_SITE", "NEWS_BLOG", "COMMUNITY",
] as const;
const labelFor = (c: string) => c.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

const FIELD = {
  width: "100%", background: "var(--bg-panel-2)", color: "var(--text)",
  border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", marginTop: 4,
};

export function AddEntryModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("YOUTUBER");
  const [bio, setBio] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = trpc.creators.submit.useMutation({
    onSuccess: onSubmitted,
    onError: (e) => setError(e.message || "Submission failed"),
  });

  const handleSubmit = () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    const links: { platform: string; url: string }[] = [];
    if (website.trim()) links.push({ platform: "website", url: website.trim() });
    submit.mutate({
      name: name.trim(),
      category,
      bio: bio.trim() || undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      links,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, width: 440, maxWidth: "100%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>Add to the Hub</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
            <X size={18} />
          </button>
        </div>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          Name *
          <input value={name} onChange={(e) => setName(e.target.value)} style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 12 }}>
          Category *
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={FIELD}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 12 }}>
          YouTube URL (optional — unlocks Heat tracking)
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@…" style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 12 }}>
          Website / other link (optional)
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" style={FIELD} />
        </label>
        <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 12 }}>
          Bio (optional)
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ ...FIELD, resize: "vertical" }} />
        </label>

        {error && <p style={{ color: "var(--neg)", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submit.isPending}
          style={{ width: "100%", marginTop: 18, background: "var(--accent)", color: "var(--bg-panel-2)", border: "none", borderRadius: 6, padding: "10px", fontWeight: 700, cursor: "pointer" }}
        >
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
