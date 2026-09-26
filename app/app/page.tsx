import Link from "next/link";
import { auth } from "@/auth";
import { signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border bg-surface">
        <span className="text-lg font-bold text-primary">Ecomly</span>
        <div className="flex items-center gap-3">
          {session ? (
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}>
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
              <Link href="/signup" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-6">
        {session ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {session.user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Welcome back, {session.user?.name}!</h1>
              <p className="text-muted-foreground mt-1">{session.user?.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-2">
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Workspace</p>
                <p className="text-foreground font-medium">Ecomly</p>
              </div>
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                <p className="text-success font-medium">Active</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 text-center max-w-lg">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-medium text-primary uppercase tracking-widest">E-commerce Workspace</span>
              <h1 className="text-5xl font-bold text-foreground leading-tight">Research. Manage.<br />Grow.</h1>
              <p className="text-muted-foreground text-lg mt-2">
                Ecomly helps you research products, track inventory, and manage your e-commerce business in one place.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/signup" className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                Get started
              </Link>
              <Link href="/login" className="border border-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors">
                Login
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}