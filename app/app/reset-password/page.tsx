"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
          password,
        }),
      });

      const data = await res.json();
      console.log("Reset password response:", data);

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setMessage("Password reset successfully. Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
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
          Reset password
        </h1>

        <p className="text-sm text-muted-foreground">
          Enter the code sent to your email and choose a new password.
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

        <input
          type="text"
          placeholder="6-digit verification code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength={6}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="border border-border rounded-lg px-4 py-2 text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}