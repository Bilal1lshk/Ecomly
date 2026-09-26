import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/database/db";
import { User } from "@/lib/models/user";
import { transporter } from "@/lib/email/nodemailer";
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a verification code has been sent.",
        success: true,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const passwordResetToken = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const passwordResetExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;

    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Reset your Ecomly password",
        html: `
          <p>Hi ${user.name},</p>
          <p>Your Ecomly password reset code is:</p>
          <h2>${otp}</h2>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request a password reset, ignore this email.</p>
        `,
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error("Password reset email error:", emailError);

      return NextResponse.json(
        { error: "Could not send reset email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification code has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}