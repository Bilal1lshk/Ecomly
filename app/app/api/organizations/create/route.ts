import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createOrganization } from "@/lib/org";

export async function POST(req: NextRequest) {
  const session = await auth();

  try {
    const body = await req.json();
    const name = body?.name?.trim();
    const slug = body?.slug?.trim();

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json({ error: "Organization name must be at least 2 characters" }, { status: 400 });
    }

    const result = await createOrganization({ name, slug });

    return NextResponse.json({ message: "Organization created", ...result }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create organization error:", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
