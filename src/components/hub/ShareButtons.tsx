"use client";

import { useState } from "react";
import { Twitter, Link2, Check } from "lucide-react";

const PILL: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 6,
  padding: "5px 10px", color: "var(--text-2)", fontSize: 12, fontWeight: 600,
  textDecoration: "none", cursor: "pointer",
};

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const x = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`;
  const reddit = `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>Share</span>
      <a href={x} target="_blank" rel="noopener noreferrer" style={PILL}>
        <Twitter size={13} /> X
      </a>
      <a href={reddit} target="_blank" rel="noopener noreferrer" style={PILL}>
        Reddit
      </a>
      <button onClick={copy} style={PILL}>
        {copied ? <Check size={13} color="var(--pos)" /> : <Link2 size={13} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
