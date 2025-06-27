const nodemailer = require("nodemailer");

exports.sendOtpEmail = async (email, otp) => {
  console.log(`[OTP] Preparing to send OTP to: ${email}`);

  // Validate inputs
  if (!email || !otp) {
    throw new Error(
      "Email and OTP are required to send the verification email."
    );
  }

  try {
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify transporter configuration
    await transporter.verify();
    console.log("[OTP] Transporter verified. Sending email...");

    // Mail content
    const mailOptions = {
      from: `"Find Your Match 💕" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code for Registration",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #ec4899;">Welcome to Find Your Match Dating App!</h2>
          <p>Hi there 👋,</p>
          <p>Use the OTP below to complete your registration:</p>
          <h1 style="color: #fff; background: #ec4899; padding: 10px 20px; border-radius: 8px; display: inline-block;">${otp}</h1>
          <p style="margin-top: 20px;">This OTP is valid for <strong>10 minutes</strong>. Please don’t share this code with anyone.</p>
          <p style="margin-top: 30px;">💌 From the <strong>Find Your Match Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[OTP] OTP email sent successfully to: ${email}`);
  } catch (error) {
    console.error("[OTP] Failed to send OTP email:", error.message);
    throw new Error("Could not send OTP email.");
  }
};
