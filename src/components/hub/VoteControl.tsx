"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function VoteControl({ entryId, initialScore }: { entryId: string; initialScore: number }) {
  const [score, setScore] = useState(initialScore);
  const [pending, setPending] = useState(false);
  const vote = trpc.creators.vote.useMutation({
    onSuccess: (res) => setScore(res.voteScore),
    onSettled: () => setPending(false),
  });

  const cast = (value: 1 | -1) => {
    setPending(true);
    vote.mutate({ entryId, value });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        onClick={() => cast(1)}
        disabled={pending}
        aria-label="Upvote"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e", padding: 2 }}
      >
        <ChevronUp size={16} />
      </button>
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
          fontSize: 13,
          color: score > 0 ? "#22c55e" : score < 0 ? "#ef4444" : "#94a3b8",
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {score}
      </span>
      <button
        onClick={() => cast(-1)}
        disabled={pending}
        aria-label="Downvote"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
