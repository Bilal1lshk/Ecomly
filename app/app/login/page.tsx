"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const FEATURES = [
  "Real-time inventory across every channel",
  "Profit & margin insight on every product",
  "One dashboard for orders and revenue",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 30 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#070B18] text-[#EEF1FB]">
      {/* ============ LEFT — immersive brand panel ============ */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
        {/* background image */}
        <div
          className="aurora-zoom absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/auth-bg.png')" }}
        />
        {/* colour washes */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020]/85 via-[#1a1145]/55 to-[#070B18]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B18] via-transparent to-[#070B18]/70" />

        {/* animated aurora blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="blob blob-a absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#7C3AED]/40 blur-[90px]" />
          <div className="blob blob-b absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#22D3EE]/30 blur-[100px]" />
          <div className="blob blob-c absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#DB2777]/30 blur-[80px]" />
        </div>

        {/* grid + floating particles */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:radial-gradient(circle_at_50%_40%,black,transparent_75%)]" />
        <div className="pointer-events-none absolute inset-0">
          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              className="spark absolute h-1 w-1 rounded-full bg-white/70"
              style={{
                left: `${(i * 7.3 + 6) % 96}%`,
                top: `${(i * 13.7 + 10) % 92}%`,
                animationDelay: `${(i % 7) * 0.9}s`,
                animationDuration: `${6 + (i % 5)}s`,
              }}
            />
          ))}
        </div>

        {/* logo */}
        <div className="rise relative z-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 0 0 5.414 17H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Ecomly</span>
        </div>

        {/* headline */}
        <div className="relative z-10 max-w-md">
          <span className="rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur-md">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#22D3EE]" />
            ALL-IN-ONE COMMERCE OS
          </span>
          <h1 className="rise mt-6 text-[2.75rem] font-bold leading-[1.1] tracking-tight">
            Run your entire store from{" "}
            <span className="gradient-text bg-clip-text text-transparent">
              one workspace.
            </span>
          </h1>
          <p className="rise mt-5 text-[15px] leading-relaxed text-white/70">
            Research products, manage inventory and track orders — without ever
            switching tabs again.
          </p>

          <ul className="mt-9 space-y-3.5">
            {FEATURES.map((f, i) => (
              <li
                key={f}
                className="rise glass-row flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/85 backdrop-blur-md"
                style={{ animationDelay: `${0.35 + i * 0.12}s` }}
              >
                <span className="check flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] ring-1 ring-white/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6 9 17l-5-5"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <div className="rise relative z-10 flex items-center gap-4 text-xs text-white/50">
          <div className="flex -space-x-2">
            {["#7C3AED", "#22D3EE", "#DB2777", "#4F46E5"].map((c) => (
              <span
                key={c}
                className="h-7 w-7 rounded-full ring-2 ring-[#0B1020]"
                style={{ background: `linear-gradient(135deg, ${c}, #ffffff55)` }}
              />
            ))}
          </div>
          <span>Trusted by multi-channel sellers</span>
        </div>
      </aside>

      {/* ============ RIGHT — glass form ============ */}
      <main className="relative flex w-full items-center justify-center overflow-hidden px-6 py-12 lg:w-1/2">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#7C3AED]/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#22D3EE]/15 blur-[120px]" />

        <div
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setSpot({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
          className="rise relative w-full max-w-[26rem]"
        >
          {/* cursor spotlight */}
          <div
            className="pointer-events-none absolute -inset-px rounded-[26px] opacity-70 transition-opacity"
            style={{
              background: `radial-gradient(420px circle at ${spot.x}% ${spot.y}%, rgba(124,58,237,.18), transparent 60%)`,
            }}
          />

          <div className="relative rounded-[26px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-2xl sm:p-10">
            {/* mobile logo */}
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] ring-1 ring-white/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 0 0 5.414 17H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">Ecomly</span>
            </div>

            <div className="mb-8">
              <h2 className="text-[1.75rem] font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Log in to continue to your workspace.
              </p>
            </div>

            {error && (
              <div className="shake mb-5 flex items-center gap-2 rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-3.5 py-2.5 text-sm text-[#FDA4AF]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="0.9" fill="currentColor" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Email address" htmlFor="email">
                <span className="icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input pl-10"
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-white/60">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-[#A78BFA] transition-colors hover:text-[#22D3EE]">
                    Forgot password?
                  </a>
                </div>
                <div className="group relative">
                  <span className="icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex items-center text-white/40 transition-colors hover:text-white/80"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-.4 1.2-1.3 2.7-2.6 4M6.6 6.6C4.6 8 3.3 10 3 12c1 3 5 7 9 7 1.2 0 2.3-.2 3.4-.6"
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary mt-2">
                {loading ? (
                  <Spinner />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {loading ? "Logging in..." : "Log in"}
              </button>

              <div className="my-1 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/40">or continue with</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setGoogleLoading(true);
                  signIn("google", { callbackUrl: "/" });
                }}
                disabled={googleLoading}
                className="btn-ghost"
              >
                {googleLoading ? (
                  <Spinner dark />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                  </svg>
                )}
                Continue with Google
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/55">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="font-semibold text-[#A78BFA] transition-colors hover:text-[#22D3EE]">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </main>

      <Styles />
    </div>
  );
}

/* ---------- small helpers (kept in-file so nothing else changes) ---------- */

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-white/60">
        {label}
      </label>
      <div className="group relative">{children}</div>
    </div>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className={dark ? "opacity-20" : "opacity-25"} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      /* --- entrance --- */
      @keyframes ecomlyRise {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rise { animation: ecomlyRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
      aside .rise:nth-of-type(1) { animation-delay: 0.05s; }

      /* --- aurora background slow zoom --- */
      @keyframes ecomlyZoom {
        0%, 100% { transform: scale(1.06) translate3d(0,0,0); }
        50% { transform: scale(1.16) translate3d(-1.5%, -1.5%, 0); }
      }
      .aurora-zoom { animation: ecomlyZoom 26s ease-in-out infinite; }

      /* --- blobs --- */
      @keyframes ecomlyBlob {
        0%, 100% { transform: translate(0,0) scale(1); }
        33% { transform: translate(30px,-40px) scale(1.12); }
        66% { transform: translate(-25px,20px) scale(0.95); }
      }
      .blob { animation: ecomlyBlob 16s ease-in-out infinite; }
      .blob-b { animation-duration: 20s; animation-delay: 1.5s; }
      .blob-c { animation-duration: 13s; animation-delay: 0.8s; }

      /* --- floating sparks --- */
      @keyframes ecomlySpark {
        0% { opacity: 0; transform: translateY(0) scale(0.6); }
        20% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-70px) scale(1.1); }
      }
      .spark { animation: ecomlySpark 7s linear infinite; }

      /* --- pulsing badge dot --- */
      @keyframes ecomlyPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,.6); }
        70% { box-shadow: 0 0 0 7px rgba(34,211,238,0); }
      }
      .pulse-dot { animation: ecomlyPulse 2s infinite; }

      /* --- animated gradient headline --- */
      @keyframes ecomlyGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .gradient-text {
        background-image: linear-gradient(120deg,#A78BFA,#22D3EE,#DB2777,#A78BFA);
        background-size: 250% 250%;
        animation: ecomlyGradient 7s ease infinite;
      }

      /* --- feature row hover lift --- */
      .glass-row { transition: transform .3s ease, background .3s ease, border-color .3s ease; }
      .glass-row:hover {
        transform: translateX(6px);
        background: rgba(255,255,255,.11);
        border-color: rgba(255,255,255,.25);
      }
      @keyframes ecomlyPop { from { transform: scale(.4); opacity:0 } to { transform: scale(1); opacity:1 } }
      .check { animation: ecomlyPop .5s cubic-bezier(.34,1.56,.64,1) both; }

      /* --- error shake --- */
      @keyframes ecomlyShake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-5px); }
        40% { transform: translateX(5px); }
        60% { transform: translateX(-3px); }
        80% { transform: translateX(3px); }
      }
      .shake { animation: ecomlyShake .45s ease-in-out; }

      /* --- inputs --- */
      .input {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.04);
        padding: 0.7rem 0.9rem;
        font-size: 0.875rem;
        color: #EEF1FB;
        outline: none;
        transition: border-color .25s, box-shadow .25s, background .25s;
      }
      .input::placeholder { color: rgba(255,255,255,.32); }
      .input:focus {
        border-color: rgba(124,58,237,.9);
        background: rgba(124,58,237,.07);
        box-shadow: 0 0 0 4px rgba(124,58,237,.16);
      }
      .icon {
        pointer-events: none;
        position: absolute;
        top: 0; bottom: 0; left: 0.9rem;
        display: flex; align-items: center;
        color: rgba(255,255,255,.4);
        transition: color .25s;
      }
      .group:focus-within .icon { color: #A78BFA; }

      /* --- primary button --- */
      .btn-primary {
        position: relative;
        overflow: hidden;
        display: flex; align-items: center; justify-content: center; gap: .5rem;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-size: 0.875rem; font-weight: 600; color: #fff;
        background-image: linear-gradient(120deg,#7C3AED,#4F46E5,#22D3EE,#7C3AED);
        background-size: 300% 100%;
        box-shadow: 0 10px 30px -10px rgba(124,58,237,.8);
        transition: background-position .6s ease, transform .15s ease, box-shadow .3s;
      }
      .btn-primary:hover:not(:disabled) {
        background-position: 100% 0;
        box-shadow: 0 14px 40px -10px rgba(34,211,238,.7);
      }
      .btn-primary:active:not(:disabled) { transform: scale(.98); }
      .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
      .btn-primary::after {
        content: "";
        position: absolute; top: 0; left: -120%;
        width: 60%; height: 100%;
        background: linear-gradient(120deg,transparent,rgba(255,255,255,.45),transparent);
        transform: skewX(-20deg);
        animation: ecomlyShine 3.6s ease-in-out infinite;
      }
      @keyframes ecomlyShine {
        0% { left: -120%; }
        55%,100% { left: 130%; }
      }

      /* --- ghost (google) button --- */
      .btn-ghost {
        display: flex; align-items: center; justify-content: center; gap: .5rem;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.05);
        padding: 0.72rem 1rem;
        font-size: 0.875rem; font-weight: 500; color: #EEF1FB;
        transition: background .25s, border-color .25s, transform .15s;
      }
      .btn-ghost:hover:not(:disabled) {
        background: rgba(255,255,255,.1);
        border-color: rgba(255,255,255,.3);
      }
      .btn-ghost:active:not(:disabled) { transform: scale(.98); }
      .btn-ghost:disabled { opacity: .6; cursor: not-allowed; }

      @media (prefers-reduced-motion: reduce) {
        .rise, .blob, .spark, .aurora-zoom, .gradient-text, .pulse-dot, .btn-primary::after {
          animation: none !important;
        }
      }
    `}</style>
  );
}
