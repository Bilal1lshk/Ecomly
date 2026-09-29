import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectDB } from "@/lib/database/db";
import { User } from "@/lib/models/user";
import { transporter } from "@/lib/email/nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email });

    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    const emailVerifyToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const emailVerifyExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const user = await User.create({
      name,
      email,
      passwordHash,
      emailVerified: false,
      emailVerifyToken,
      emailVerifyExpires,
    });

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Verify your Ecomly email",
        html: `
          <p>Hi ${name},</p>
          <p>Your Ecomly verification code is:</p>
          <h2>${otp}</h2>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not sign up, ignore this email.</p>
        `,
      });
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });

      console.error("Email sending error:", emailError);

      return NextResponse.json(
        { error: "Could not send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Account created. Please check your email for the verification code.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}