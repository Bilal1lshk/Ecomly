import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/database/db";
import { User } from "@/lib/models/user";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    await connectDB();

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
console.log("VERIFY EMAIL:", email);
console.log("OTP HASH:", hashedOtp);

    const user = await User.findOne({
      email,
      emailVerifyToken: hashedOtp,
      emailVerifyExpires: { $gt: new Date() },
    }).select("+emailVerifyToken +emailVerifyExpires");
console.log("USER FOUND:", !!user);
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}