"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong");
        return;
      }

      setMessage(data.message);
      router.push("/reset-password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-full max-w-sm p-8 bg-surface rounded-xl shadow border border-border"
      >
        <h1 className="text-2xl font-semibold text-foreground">
          Forgot password
        </h1>

        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send you a verification code.
        </p>

        {error && (
          <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-success bg-success-bg px-3 py-2 rounded-lg">
            {message}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending..." : "Send verification code"}
        </button>

        <p className="text-sm text-center text-muted-foreground">
          Remember your password?{" "}
          <a
            href="/login"
            className="text-primary font-medium hover:text-primary-hover"
          >
            Login
          </a>
        </p>
      </form>
    </div>
  );
}