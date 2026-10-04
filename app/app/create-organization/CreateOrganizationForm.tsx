"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(generateSlug(newName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      <main className="relative flex w-full items-center justify-center overflow-hidden px-6 py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#C75B3A]/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#B8863B]/15 blur-[120px]" />

        <div className="rise relative w-full max-w-[28rem]">
          <div className="relative rounded-[26px] border border-border bg-surface p-8 shadow-[0_30px_80px_-24px_rgba(124,50,32,.25)] backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <h2 className="text-[1.75rem] font-semibold tracking-tight">Create your organization</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Set up your workspace to get started
              </p>
            </div>

            {error && (
              <div className="shake mb-5 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v5m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                  Organization name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g., My Store"
                  className="input"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label htmlFor="slug" className="mb-2 block text-sm font-medium text-foreground">
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, ""))}
                  placeholder="my-store"
                  className="input"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Used in URLs, auto-generated from name
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="btn-primary w-full"
              >
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </form>
          </div>
        </div>
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 0.7rem 0.9rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          transition: border-color .25s, box-shadow .25s, background .25s;
        }
        .input::placeholder { color: rgba(107,104,98,.55); }
        .input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(199,91,58,.12);
        }
        .btn-primary {
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem; font-weight: 600; color: #fff;
          background-image: linear-gradient(120deg,#C75B3A,#A9472E,#B8863B,#C75B3A);
          background-size: 300% 100%;
          box-shadow: 0 10px 28px -10px rgba(199,91,58,.6);
          transition: background-position .6s ease, transform .15s ease, box-shadow .3s;
        }
        .btn-primary:hover:not(:disabled) {
          background-position: 100% 0;
          box-shadow: 0 14px 36px -10px rgba(184,134,59,.55);
        }
        .btn-primary:active:not(:disabled) { transform: scale(.98); }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .shake { animation: ecomlyShake .45s ease-in-out; }
        @keyframes ecomlyShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .rise { animation: ecomlyRise .9s ease-out both; }
        @keyframes ecomlyRise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
