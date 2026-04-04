"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.push("/");
    } else {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400 mb-4">
          <span className="text-slate-950 font-bold">P</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100">Sign in to PokeInvestment</h1>
        <p className="text-sm text-slate-500 mt-1">Bloomberg Terminal for Pokémon TCG</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        {error && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded p-2">{error}</div>
        )}
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1.5">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-md py-2 transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        No account?{" "}
        <Link href="/register" className="text-amber-400 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
