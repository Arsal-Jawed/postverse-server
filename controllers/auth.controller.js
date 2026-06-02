// controllers/auth.controller.js
import bcrypt from "bcryptjs"
import {
  createUser,
  findUserByEmail,
  verifyUserEmailByOtp,
  updateVerificationOtp,
  setPasswordResetOtp,
  findUserByResetOtp,
  updatePasswordById,
} from "../models/user.model.js"
import { generateToken } from "../modules/auth.js"
import { requireFields, isValidEmail, isStrongPassword } from "../modules/validate.js"
import { sendVerificationOtp, sendPasswordResetOtp } from "../modules/mailer.js"

const OTP_EXPIRY_MS = 10 * 60 * 1000

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000))

const otpExpiresAt = () => new Date(Date.now() + OTP_EXPIRY_MS)

// ── POST /api/auth/register ─────────────────────────────────────────────────
export const register = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["username", "email", "password"])
  if (!valid) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` })
  }

  const { username, email, password, avatar_url } = req.body

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  try {
    const hashed = await bcrypt.hash(password, 10)
    const otp = generateOtp()
    const expiresAt = otpExpiresAt()

    const user = await createUser({
      username,
      email,
      password: hashed,
      avatar_url,
      verification_token: otp,
      verification_otp_expires: expiresAt,
    })

    await sendVerificationOtp(email, username, otp)

    res.status(201).json({
      message: "Account created. Enter the verification code sent to your email.",
      user,
    })
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username or email already exists" })
    }
    res.status(500).json({ error: "Registration failed", detail: err.message })
  }
}

// ── POST /api/auth/verify-otp ───────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["email", "otp"])
  if (!valid) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` })
  }

  const { email, otp } = req.body

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  const normalizedOtp = String(otp).trim()
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: "Verification code must be 6 digits" })
  }

  try {
    const user = await verifyUserEmailByOtp(email, normalizedOtp)
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification code" })
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email })

    res.json({
      message: "Email verified successfully",
      user,
      token,
    })
  } catch (err) {
    res.status(500).json({ error: "Verification failed", detail: err.message })
  }
}

// ── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["email", "password"])
  if (!valid) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` })
  }

  const { email, password } = req.body

  try {
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in" })
    }

    const token = generateToken({ id: user.id, username: user.username, email: user.email })
    const { password: _, ...safeUser } = user

    res.json({ message: "Login successful", user: safeUser, token })
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: err.message })
  }
}

// ── GET /api/auth/me ────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  res.json({ user: req.user })
}

// ── POST /api/auth/resend-verification ──────────────────────────────────────
export const resendVerification = async (req, res) => {
  const { email } = req.body

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" })
  }

  try {
    const otp = generateOtp()
    const expiresAt = otpExpiresAt()
    const user = await updateVerificationOtp(email, otp, expiresAt)

    if (user) {
      await sendVerificationOtp(email, user.username, otp)
    }

    res.json({
      message: "If that email exists and is unverified, a new verification code has been sent.",
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to send verification code", detail: err.message })
  }
}

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const { email } = req.body

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" })
  }

  try {
    const otp = generateOtp()
    const expiresAt = otpExpiresAt()
    const user = await setPasswordResetOtp(email, otp, expiresAt)

    if (user) {
      await sendPasswordResetOtp(email, user.username, otp)
    }

    res.json({
      message: "If an account exists with that email, a password reset code has been sent.",
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to send password reset code", detail: err.message })
  }
}

// ── POST /api/auth/verify-reset-otp ───────────────────────────────────────────
export const verifyResetOtp = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["email", "otp"])
  if (!valid) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` })
  }

  const { email, otp } = req.body

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  const normalizedOtp = String(otp).trim()
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: "Reset code must be 6 digits" })
  }

  try {
    const user = await findUserByResetOtp(email, normalizedOtp)
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code" })
    }

    res.json({ message: "Code verified. You can set a new password." })
  } catch (err) {
    res.status(500).json({ error: "Verification failed", detail: err.message })
  }
}

// ── POST /api/auth/reset-password ───────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["email", "otp", "password"])
  if (!valid) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` })
  }

  const { email, otp, password } = req.body

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  const normalizedOtp = String(otp).trim()
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ error: "Reset code must be 6 digits" })
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  try {
    const user = await findUserByResetOtp(email, normalizedOtp)
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset code" })
    }

    const hashed = await bcrypt.hash(password, 10)
    await updatePasswordById(user.id, hashed)

    res.json({ message: "Password reset successfully. You can now sign in with your new password." })
  } catch (err) {
    res.status(500).json({ error: "Password reset failed", detail: err.message })
  }
}
