// controllers/auth.controller.js
import bcrypt from "bcryptjs"
import { createUser, findUserByEmail } from "../models/user.model.js"
import { generateToken } from "../modules/auth.js"
import { requireFields, isValidEmail, isStrongPassword } from "../modules/validate.js"

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
    const user = await createUser({ username, email, password: hashed, avatar_url })
    const token = generateToken({ id: user.id, username: user.username, email: user.email })

    res.status(201).json({ message: "User registered successfully", user, token })
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username or email already exists" })
    }
    res.status(500).json({ error: "Registration failed", detail: err.message })
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
