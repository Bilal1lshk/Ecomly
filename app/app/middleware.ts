import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/create-organization",
  "/api/auth",
  "/api/organizations/create",
];

const API_PATHS = ["/api"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  return false;
}

function isApiPath(pathname: string): boolean {
  return API_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Skip API routes from org check (they should handle their own auth/org logic)
  if (isApiPath(pathname)) {
    return NextResponse.next();
  }

  // For dashboard and other protected routes, check if user has an organization
  // We need to check membership - but middleware can't easily use mongoose models in edge runtime?
  // Let us use a cookie or check via a lightweight approach. Alternatively, let us add a token/cookie
  // But easier approach: let us use getCurrentMembership via a server action call isn't possible in middleware directly
  // Alternative: store orgId in session (JWT) - let us check auth.ts - session doesn't store orgId
  // Or we can make a quick API call? Not ideal in middleware. Another option: use ensureOrgId logic differently
  // Or redirect to create-organization if needed, and let the create org flow work
  // For now, let us also add org check by checking membership via a header/cookie? Or simpler: 
  // let us modify middleware to be more flexible - maybe check if there's a membership by looking up? 
  // But mongoose might not work well in middleware. Let us look up the project - does it use edge middleware?
  // Maybe better to handle org check in the DashboardGuard since DashboardGuard runs server-side in RSC.
  // But user wants "proxy so it redirect if user is not the part of organization" - "proxy" could mean middleware.
  // Let us also update DashboardGuard to enforce redirect to create-organization if no org.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
