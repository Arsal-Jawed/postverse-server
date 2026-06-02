import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export const sendVerificationOtp = async (to, username, otp) => {
  const mailOptions = {
    from: `"Postverse" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Postverse verification code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Welcome to Postverse, ${username}!</h2>
        <p style="font-size: 16px; color: #555;">
          Use this one-time code to verify your email address. It expires in 10 minutes.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #f4f4f5; color: #111; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 28px; border-radius: 8px;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 14px; color: #888;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          &copy; 2026 Postverse. All rights reserved.
        </p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}

export const sendPasswordResetOtp = async (to, username, otp) => {
  const mailOptions = {
    from: `"Postverse" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Postverse password reset code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Reset your password</h2>
        <p style="font-size: 16px; color: #555;">
          Hi ${username}, use this one-time code to reset your Postverse password. It expires in 10 minutes.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #f4f4f5; color: #111; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 28px; border-radius: 8px;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 14px; color: #888;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          &copy; 2026 Postverse. All rights reserved.
        </p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
