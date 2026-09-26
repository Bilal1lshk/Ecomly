"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

if (!res.ok) {
  setError(data.error || "Something went wrong");
} else {
  router.push(`/verify-email?email=${encodeURIComponent(email)}`);
}
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm p-8 bg-surface rounded-xl shadow border border-border">
        <h1 className="text-2xl font-semibold text-foreground">Create account</h1>
        {error && (
          <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{error}</p>
        )}
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary font-medium hover:text-primary-hover">Login</a>
        </p>
      </form>
    </div>
  );
}