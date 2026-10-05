import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/database/db";
import { User } from "@/lib/models/user";

const NAME_MAX = 60;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.length > NAME_MAX) {
      return NextResponse.json(
        { error: `Name is too long (max ${NAME_MAX} characters)` },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    ).select("name");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Profile updated", name: user.name });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
